// src/controllers/commission.controller.js
const db = require("../config/db");
const { ROLES } = require("../middleware/rbac");

const hasGlobalAccess = (role) =>
  [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);

// --- 1. GET ALL COMMISSIONS (PAGINATED & SEARCHABLE) ---
exports.getCommissions = async (req, res, next) => {
  try {
    const {
      store,
      date,
      status,
      audit_status,
      payment_status, // 🔥 ADDED: Support for Payment Status Filtering
      date_from,
      date_to,
      specific_dates,
      search,
    } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let targetMarket = req.query.market;
    if (!hasGlobalAccess(req.user.role)) targetMarket = req.user.market;

    let whereClauses = ["1=1"];
    let params = [];

    // --- Core Filters ---
    if (targetMarket) {
      params.push(targetMarket.trim().toLowerCase());
      whereClauses.push(`LOWER(TRIM(market)) = LOWER(TRIM($${params.length}))`);
    }
    if (store) {
      params.push(`%${store.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(store) LIKE $${params.length}`);
    }
    if (status && status !== "all") {
      params.push(status.toLowerCase());
      whereClauses.push(`status = $${params.length}`);
    }
    if (audit_status && audit_status !== "all") {
      if (audit_status === "pending") {
        whereClauses.push(`(audit_status IS NULL OR audit_status = 'pending')`);
      } else {
        params.push(audit_status.toLowerCase());
        whereClauses.push(`audit_status = $${params.length}`);
      }
    }
    if (payment_status && payment_status !== "all") {
      // 🔥 ADDED
      params.push(payment_status.toLowerCase());
      whereClauses.push(`payment_status = $${params.length}`);
    }

    // 🔥 Mutually Exclusive Dates
    if (date) {
      params.push(date);
      whereClauses.push(`date = $${params.length}`);
    } else if (specific_dates) {
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

    // 🔥 Server-Side Search
    if (search) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        market ILIKE $${searchIdx} OR 
        store ILIKE $${searchIdx} OR
        employee_name ILIKE $${searchIdx} OR
        employee_id ILIKE $${searchIdx} OR
        reason_for_add_amount ILIKE $${searchIdx}
      )`);
    }

    // 🔥 Grand Totals & Available Dates
    const countSql = `
      SELECT 
        COUNT(*) as total_records, 
        COALESCE(SUM(CAST(total_commission AS NUMERIC)), 0) as grand_total_commission,
        COALESCE(SUM(CAST(final_commission AS NUMERIC)), 0) as grand_final_commission,
        COALESCE(SUM(CAST(csat_comm_loss AS NUMERIC)), 0) as grand_csat_loss,
        ARRAY_AGG(DISTINCT TO_CHAR(date, 'YYYY-MM-DD')) as available_dates
      FROM commission_data 
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    const totals = {
      total_commission: parseFloat(countRows[0].grand_total_commission),
      final_commission: parseFloat(countRows[0].grand_final_commission),
      csat_loss: parseFloat(countRows[0].grand_csat_loss),
    };

    // Pagination bounds
    params.push(limit, offset);

    const sql = `
      SELECT *
      FROM commission_data
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY date DESC, market, store, employee_name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await db.query(sql, params);

    return res.json({
      data: rows,
      summary: {
        totals,
        availableDates,
      },
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (e) {
    console.error("❌ Commission fetch error:", e.message);
    next(e);
  }
};

// --- 2. CREATE COMMISSION ENTRY ---
exports.createCommission = async (req, res, next) => {
  try {
    let payload = req.body;

    if (req.user.role === ROLES.MARKET_MANAGER) {
      if (
        payload.market &&
        payload.market.toLowerCase() !== req.user.market.toLowerCase()
      ) {
        return res
          .status(403)
          .json({ error: "Cannot submit data for another market." });
      }
      payload.market = req.user.market;
    }

    if (
      !payload.date ||
      !payload.market ||
      !payload.store ||
      !payload.employee_name
    ) {
      return res.status(400).json({
        error: "Date, Market, Store, and Employee Name are required.",
      });
    }

    const columns = [
      "date",
      "date_period",
      "market",
      "store",
      "username",
      "employee_id",
      "employee_name",
      "csat_score",
      "csat_comm_loss",
      "rebate_chargeback",
      "deposit_chargeback",
      "inventory_variance_chargeback",
      "late_clock_in_chargeback",
      "write_ups",
      "reimbursements",
      "activation_count",
      "act_comm",
      "upgrade_count",
      "upg_comm",
      "hint_sold",
      "hint_comm",
      "qualified_box",
      "box_comm",
      "vas_mrc",
      "vas_avg",
      "vas_commission",
      "acc_profit",
      "acc_tier",
      "acc_commission",
      "retention_35",
      "retention_65",
      "retention_95",
      "retention_125",
      "retention_155",
      "retention_185",
      "retention_215",
      "retention_245",
      "retention_275",
      "retention_305",
      "retention_335",
      "retention_365",
      "retention_commission",
      "leasing_done",
      "leasing_commission",
      "his_spiff",
      "total_commission",
      "final_commission",
      "status",
      "audit_status",
      "entry_reason",
      "add_amount_by_mm",
      "reason_for_add_amount",
      "payment_status", // 🔥 NEW COLUMNS ADDED HERE
    ];

    const values = [];
    const placeholders = [];

    columns.forEach((col, index) => {
      let val = payload[col];

      // Default statuses for new entries
      // Default statuses for new entries
      if (col === "status" || col === "audit_status") val = "pending";
      if (col === "payment_status") val = payload.payment_status || "pending";
      if (col === "username") val = req.user.email;

      // Handle null/empty for numeric and string fields safely
      if (val === "" || val === undefined) val = null;

      values.push(val);
      placeholders.push(`$${index + 1}`);
    });

    const sql = `
      INSERT INTO commission_data (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *
    `;

    const { rows } = await db.query(sql, values);
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error("❌ Commission Insert Error:", e.message);
    next(e);
  }
};

// --- 3. UPDATE COMMISSION ENTRY (EDIT) ---
exports.updateCommission = async (req, res, next) => {
  try {
    const id = req.params.id;
    let payload = req.body;

    if (req.user.role === ROLES.MARKET_MANAGER) {
      if (
        payload.market &&
        payload.market.toLowerCase() !== req.user.market.toLowerCase()
      ) {
        return res
          .status(403)
          .json({ error: "Cannot update data for another market." });
      }
      payload.market = req.user.market;
    }

    const columns = [
      "date",
      "date_period",
      "market",
      "store",
      "employee_id",
      "employee_name",
      "csat_score",
      "csat_comm_loss",
      "rebate_chargeback",
      "deposit_chargeback",
      "inventory_variance_chargeback",
      "late_clock_in_chargeback",
      "write_ups",
      "reimbursements",
      "activation_count",
      "act_comm",
      "upgrade_count",
      "upg_comm",
      "hint_sold",
      "hint_comm",
      "qualified_box",
      "box_comm",
      "vas_mrc",
      "vas_avg",
      "vas_commission",
      "acc_profit",
      "acc_tier",
      "acc_commission",
      "retention_35",
      "retention_65",
      "retention_95",
      "retention_125",
      "retention_155",
      "retention_185",
      "retention_215",
      "retention_245",
      "retention_275",
      "retention_305",
      "retention_335",
      "retention_365",
      "retention_commission",
      "leasing_done",
      "leasing_commission",
      "his_spiff",
      "total_commission",
      "final_commission",
      "entry_reason",
      "notes",
      "add_amount_by_mm",
      "reason_for_add_amount",
      "payment_status", // 🔥 NEW FIELDS ADDED HERE
    ];

    const setClauses = [];
    const values = [];

    columns.forEach((col) => {
      let val = payload[col];
      if (val === "" || val === undefined) val = null;

      values.push(val);
      setClauses.push(`${col} = $${values.length}`);
    });

    // 🔥 Force status reset exactly ONCE here
    setClauses.push(`status = 'pending'`);
    setClauses.push(`audit_status = 'pending'`);
    setClauses.push(`reason = NULL`);

    values.push(id); // push ID as the last parameter

    const sql = `
      UPDATE commission_data 
      SET ${setClauses.join(", ")} 
      WHERE id = $${values.length} 
      RETURNING *
    `;

    const { rows } = await db.query(sql, values);

    if (!rows.length) {
      return res.status(404).json({ error: "Commission record not found" });
    }

    return res.json(rows[0]);
  } catch (e) {
    console.error("❌ Commission Update Error:", e.message);
    next(e);
  }
};

// --- 4. APPROVE COMMISSION ---
exports.approveCommission = async (req, res, next) => {
  try {
    const sql = `UPDATE commission_data SET status = 'approved', reason = $2 WHERE id = $1 RETURNING *`;
    const { rows } = await db.query(sql, [
      req.params.id,
      req.body.reason || "",
    ]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// --- 5. REJECT COMMISSION ---
exports.rejectCommission = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const reason = req.body.reason || "";
    await client.query("BEGIN");

    const sql = `UPDATE commission_data SET status = 'rejected', reason = $2 WHERE id = $1 RETURNING *`;
    const { rows } = await client.query(sql, [req.params.id, reason]);

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }

    const item = rows[0];
    const message = `Commission for ${item.employee_name} ($${item.final_commission}) in ${item.store} was rejected. Reason: ${reason}`;

    await client.query(
      `INSERT INTO notifications (market, store, message, type) VALUES ($1, $2, $3, 'rejection')`,
      [item.market, item.store, message],
    );

    await client.query("COMMIT");
    res.json(item);
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
};

// --- 6. AUDIT COMMISSION ---
exports.auditCommission = async (req, res, next) => {
  try {
    const sql = `UPDATE commission_data SET audit_status = 'audited', audit_by = $2 WHERE id = $1 RETURNING *`;
    const { rows } = await db.query(sql, [req.params.id, req.user.email]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// --- 7. RAISE ISSUE (RESET TO PENDING) ---
exports.raiseIssue = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { notes } = req.body;

    if (!notes) {
      return res
        .status(400)
        .json({ error: "Notes are required to report an issue" });
    }

    const sql = `
      UPDATE commission_data
      SET 
        notes = $1,
        status = 'pending',
        audit_status = 'pending',
        reason = NULL 
      WHERE id = $2
      RETURNING *;
    `;

    const { rows } = await db.query(sql, [notes, id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Commission record not found" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("❌ Commission Issue Error:", e.message);
    next(e);
  }
};

// --- 8. MARK AS PAID BY MM ---
exports.markCommissionPaid = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { add_amount_by_mm, reason_for_add_amount } = req.body;

    const sql = `
      UPDATE commission_data
      SET 
        add_amount_by_mm = $1,
        reason_for_add_amount = $2,
        payment_status = 'paid',       -- 🔥 Mark as paid!
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
      return res.status(404).json({ error: "Commission record not found" });

    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};
