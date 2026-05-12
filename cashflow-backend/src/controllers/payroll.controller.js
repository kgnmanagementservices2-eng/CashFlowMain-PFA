// src/controllers/payroll.controller.js
const db = require("../config/db");
const { ROLES } = require("../middleware/rbac");

const hasGlobalAccess = (role) =>
  [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);

const safeNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

// 1. GET ALL WITH PAGINATION, GRAND TOTALS, & SEARCH
exports.getPayroll = async (req, res, next) => {
  try {
    const {
      store,
      date,
      date_from,
      date_to,
      specific_dates,
      category,
      status,
      audit_status,
      payment_status, // 🔥 ADDED: Support for Payment Status Filtering
      date_period,
      search,
    } = req.query;

    // Pagination Parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let targetMarket = req.query.market;
    if (!hasGlobalAccess(req.user.role)) targetMarket = req.user.market;

    let whereClauses = ["1=1"];
    let params = [];

    // --- STANDARD FILTERS ---
    if (targetMarket) {
      params.push(targetMarket.trim().toLowerCase());
      whereClauses.push(`LOWER(TRIM(market)) = LOWER(TRIM($${params.length}))`);
    }
    if (store) {
      params.push(store.trim().toLowerCase());
      whereClauses.push(`LOWER(TRIM(store)) = LOWER(TRIM($${params.length}))`);
    }
    if (category) {
      params.push(category.trim().toLowerCase());
      whereClauses.push(`LOWER(category) = $${params.length}`);
    }
    if (status) {
      params.push(status.trim().toLowerCase());
      whereClauses.push(`status = $${params.length}`);
    }
    if (audit_status) {
      params.push(audit_status.trim().toLowerCase());
      whereClauses.push(`audit_status = $${params.length}`);
    }
    if (payment_status) {
      // 🔥 ADDED: Payment Status Filter Logic
      params.push(payment_status.trim().toLowerCase());
      whereClauses.push(`payment_status = $${params.length}`);
    }
    if (date_period) {
      params.push(date_period.trim());
      whereClauses.push(`date_period = $${params.length}`);
    }

    // 🔥 MUTUALLY EXCLUSIVE DATE LOGIC
    if (date) {
      params.push(date);
      whereClauses.push(`date = $${params.length}`);
    } else if (specific_dates) {
      // Handles multi-date filtering perfectly
      const dateList = specific_dates.split(",").map((d) => d.trim());
      const placeholders = [];
      for (const d of dateList) {
        params.push(d);
        placeholders.push(`$${params.length}`);
      }
      whereClauses.push(`date IN (${placeholders.join(",")})`);
    } else {
      if (date_from) {
        params.push(date_from);
        whereClauses.push(`date >= $${params.length}`);
      }
      if (date_to) {
        params.push(date_to);
        whereClauses.push(`date <= $${params.length}`);
      }
    }

    // 🔥 SERVER-SIDE SEARCH
    if (search) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        employee_name ILIKE $${searchIdx} OR 
        employee_id ILIKE $${searchIdx} OR 
        store ILIKE $${searchIdx} OR 
        notes ILIKE $${searchIdx} OR
        reason ILIKE $${searchIdx}
      )`);
    }

    // 🔥 COUNT, GRAND TOTAL & AVAILABLE DATES (Ignores Pagination limits)
    const countSql = `
      SELECT 
        COUNT(*) as total_records, 
        COALESCE(SUM(net_final_pay), 0) as total_amount,
        ARRAY_AGG(DISTINCT TO_CHAR(date, 'YYYY-MM-DD')) as available_dates
      FROM payroll_expenses 
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const grandTotalAmount = parseFloat(countRows[0].total_amount);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    // Push Pagination Limits to Params safely
    params.push(limit, offset);

    const sql = `
      SELECT *
      FROM payroll_expenses
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY date_period DESC, date DESC, id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await db.query(sql, params);

    // 🔥 Return the unified payload structure
    return res.json({
      data: rows,
      summary: {
        totalAmount: grandTotalAmount,
        availableDates: availableDates,
      },
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (e) {
    next(e);
  }
};

// 2. CREATE PAYROLL
exports.createPayroll = async (req, res, next) => {
  try {
    const user = req.user;
    let payload = req.body;
    let market =
      user.role === ROLES.MARKET_MANAGER ? user.market : payload.market;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date)))
      return res.status(400).json({ error: "Invalid date format" });

    const useUniqueId =
      payload.unique_id ||
      `${market || ""}${payload.store || ""}${payload.date || ""}`
        .replace(/\s+/g, "")
        .toLowerCase();

    const sql = `
      INSERT INTO payroll_expenses (
        date, market, store, category, amount, notes, status, unique_id, username,
        employee_id, employee_name, date_period, pay_type, pay_rate, pay_rate_hike,
        working_days_1, hours_worked_1, working_days_2, hours_worked_2,
        hours_adjusted, days_adjusted, total_days_worked, total_hours, net_pay,
        salary, total_days_to_work, salary_hike, gross_pay, lop_count,
        credits, deductions, loans_advances, reimbursements,
        add_amount_by_mm, reason_for_add_amount, net_final_pay, payment_status, employee_stats
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
        $29,$30,$31,$32,$33,$34,$35,$36,$37
      ) RETURNING *`;

    const values = [
      payload.date,
      market,
      payload.store,
      payload.category,
      safeNum(payload.amount),
      payload.notes || "",
      useUniqueId,
      user.email,
      payload.employee_id,
      payload.employee_name,
      payload.date_period,
      payload.pay_type,
      safeNum(payload.pay_rate),
      safeNum(payload.pay_rate_hike),
      safeNum(payload.working_days_1),
      safeNum(payload.hours_worked_1),
      safeNum(payload.working_days_2),
      safeNum(payload.hours_worked_2),
      safeNum(payload.hours_adjusted),
      safeNum(payload.days_adjusted),
      safeNum(payload.total_days_worked),
      safeNum(payload.total_hours),
      safeNum(payload.net_pay),
      safeNum(payload.salary),
      safeNum(payload.total_days_to_work),
      safeNum(payload.salary_hike),
      safeNum(payload.gross_pay),
      safeNum(payload.lop_count),
      safeNum(payload.credits),
      safeNum(payload.deductions),
      safeNum(payload.loans_advances),
      safeNum(payload.reimbursements),
      safeNum(payload.add_amount_by_mm),
      payload.reason_for_add_amount,
      safeNum(payload.net_final_pay),
      payload.payment_status || "pending",
      payload.employee_stats,
    ];

    const { rows } = await db.query(sql, values);
    return res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// 3. APPROVE PAYROLL
exports.approvePayroll = async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    const { rows } = await db.query(
      `UPDATE payroll_expenses SET status='approved', reason=$2 WHERE id=$1 RETURNING *`,
      [req.params.id, reason || null],
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    return res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// 4. REJECT PAYROLL
exports.rejectPayroll = async (req, res, next) => {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason || "").trim();

  if (!id || !reason)
    return res.status(400).json({ error: "ID and reason required" });

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE payroll_expenses SET status='rejected', reason=$2 WHERE id=$1 RETURNING *`,
      [id, reason],
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }

    const item = rows[0];
    const message = `PAYROLL of $${item.amount} for ${item.store} was rejected. Reason: ${reason}`;
    await client.query(
      `INSERT INTO notifications (market, store, message, type) VALUES ($1,$2,$3,'rejection')`,
      [item.market, item.store, message],
    );

    await client.query("COMMIT");
    return res.json(item);
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
};

// 5. AUDIT PAYROLL
exports.auditPayroll = async (req, res, next) => {
  try {
    const auditor = req.user.fullName || req.user.email;
    const { rows } = await db.query(
      `UPDATE payroll_expenses SET audit_status='audited', audit_by=$2 WHERE id=$1 RETURNING *`,
      [req.params.id, auditor],
    );
    return res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// 6. 🚀 DEDICATED RAISE ISSUE FUNCTION
exports.raiseIssue = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { notes } = req.body;

    if (!notes)
      return res
        .status(400)
        .json({ error: "Notes are required to report an issue" });

    // Resets statuses back to pending and updates the notes
    const sql = `
      UPDATE payroll_expenses
      SET 
        notes = $1,
        status = 'pending',
        audit_status = 'pending',
        reason = NULL 
      WHERE id = $2
      RETURNING *;
    `;

    const { rows } = await db.query(sql, [notes, id]);

    if (!rows.length)
      return res.status(404).json({ error: "Payroll record not found" });

    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// 7. MARK AS PAID BY MM
exports.markPayrollPaid = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { add_amount_by_mm, reason_for_add_amount } = req.body;

    const sql = `
      UPDATE payroll_expenses
      SET 
        add_amount_by_mm = $1,
        reason_for_add_amount = $2,
        payment_status = 'paid',       -- 🔥 CRITICAL FIX: Mark as paid!
        status = 'pending',            -- Resets approval status
        audit_status = 'pending'       -- Resets audit status
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await db.query(sql, [
      add_amount_by_mm,
      reason_for_add_amount || null,
      id,
    ]);

    if (!rows.length)
      return res.status(404).json({ error: "Payroll record not found" });

    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// 8. UPDATE PAYROLL RECORD
// 7. UPDATE PAYROLL
exports.updatePayrollExpense = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user = req.user;
    let payload = req.body;

    // Maintain market restrictions if applicable
    let market =
      user.role === ROLES.MARKET_MANAGER ? user.market : payload.market;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date)))
      return res.status(400).json({ error: "Invalid date format" });

    const sql = `
      UPDATE payroll_expenses 
      SET 
        date = $1, market = $2, store = $3, category = $4, amount = $5, notes = $6,
        employee_id = $7, employee_name = $8, date_period = $9, pay_type = $10,
        pay_rate = $11, pay_rate_hike = $12, working_days_1 = $13, hours_worked_1 = $14,
        working_days_2 = $15, hours_worked_2 = $16, hours_adjusted = $17, days_adjusted = $18,
        total_days_worked = $19, total_hours = $20, net_pay = $21, salary = $22,
        total_days_to_work = $23, salary_hike = $24, gross_pay = $25, lop_count = $26,
        credits = $27, deductions = $28, loans_advances = $29, reimbursements = $30,
        add_amount_by_mm = $31, reason_for_add_amount = $32, net_final_pay = $33, 
        payment_status = $34, employee_stats = $35,
        status = 'pending', audit_status = 'pending' 
      WHERE id = $36
      RETURNING *;
    `;

    const values = [
      payload.date,
      market,
      payload.store,
      payload.category,
      safeNum(payload.amount),
      payload.notes || "",
      payload.employee_id,
      payload.employee_name,
      payload.date_period,
      payload.pay_type,
      safeNum(payload.pay_rate),
      safeNum(payload.pay_rate_hike),
      safeNum(payload.working_days_1),
      safeNum(payload.hours_worked_1),
      safeNum(payload.working_days_2),
      safeNum(payload.hours_worked_2),
      safeNum(payload.hours_adjusted),
      safeNum(payload.days_adjusted),
      safeNum(payload.total_days_worked),
      safeNum(payload.total_hours),
      safeNum(payload.net_pay),
      safeNum(payload.salary),
      safeNum(payload.total_days_to_work),
      safeNum(payload.salary_hike),
      safeNum(payload.gross_pay),
      safeNum(payload.lop_count),
      safeNum(payload.credits),
      safeNum(payload.deductions),
      safeNum(payload.loans_advances),
      safeNum(payload.reimbursements),
      safeNum(payload.add_amount_by_mm),
      payload.reason_for_add_amount,
      safeNum(payload.net_final_pay),
      payload.payment_status || "pending",
      payload.employee_stats,
      id,
    ];

    const { rows } = await db.query(sql, values);

    if (!rows.length) {
      return res.status(404).json({ error: "Payroll record not found" });
    }

    return res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};
