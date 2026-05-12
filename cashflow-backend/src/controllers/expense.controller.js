// src/controllers/expense.controller.js
const db = require("../config/db");
const { ROLES } = require("../middleware/rbac");

const hasGlobalAccess = (role) =>
  [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);

// 1. 🚀 UNIFIED GET EXPENSES (Handles Search, Pagination, and Grand Totals)
exports.getExpenses = async (req, res, next) => {
  try {
    const {
      store,
      date,
      date_from,
      date_to,
      category,
      status,
      audit_status,
      search,
      specific_dates,
    } = req.query;

    // Pagination Parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let targetMarket = req.query.market;
    if (!hasGlobalAccess(req.user.role)) targetMarket = req.user.market;

    let whereClauses = ["1=1"];
    let params = [];

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
    if (date) {
      params.push(date);
      whereClauses.push(`expense_date = $${params.length}`);
    } else if (specific_dates) {
      // 🔥 FIX: Exact match for specific days!
      // Turns "2026-04-01,2026-04-30" into an SQL IN clause: expense_date IN ($X, $Y)
      const dateList = specific_dates.split(",").map((d) => d.trim());
      const placeholders = [];
      for (const d of dateList) {
        params.push(d);
        placeholders.push(`$${params.length}`);
      }
      whereClauses.push(`expense_date IN (${placeholders.join(",")})`);
    } else {
      // Fallback to standard month range
      if (date_from) {
        params.push(date_from);
        whereClauses.push(`expense_date >= $${params.length}`);
      }
      if (date_to) {
        params.push(date_to);
        whereClauses.push(`expense_date <= $${params.length}`);
      }
    }

    // 🚀 Server-Side Search functionality
    if (search) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        managername ILIKE $${searchIdx} OR 
        store ILIKE $${searchIdx} OR 
        comment ILIKE $${searchIdx} OR 
        reason ILIKE $${searchIdx}
      )`);
    }

    // 🔥 1. Get Grand Total & Count (Irrespective of Pagination)
    const countSql = `
      SELECT 
        COUNT(*) as total_records, 
        COALESCE(SUM(amount), 0) as total_amount,
        ARRAY_AGG(DISTINCT TO_CHAR(expense_date, 'YYYY-MM-DD')) as available_dates
      FROM expenses 
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const grandTotalAmount = parseFloat(countRows[0].total_amount);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();
    // 🔥 2. Get Paginated Data
    // Notice the aliases (AS date, AS amount_numeric) so we don't break your frontend tables!
    params.push(limit, offset);
    const sql = `
      SELECT
        id, expense_date AS date, expense_date, market, store, category, 
        amount, amount AS amount_numeric, upload_url, comment, comment AS notes, 
        status, reason, audit_status, audit_by, unique_id, managername, username
      FROM expenses
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY expense_date DESC, id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await db.query(sql, params);

    // Return Data + Pagination + Grand Totals
    return res.json({
      data: rows,
      summary: {
        totalAmount: grandTotalAmount,
        availableDates: availableDates, // 🚀 Now sending all dates to frontend!
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

// 2. CREATE EXPENSE
exports.createExpense = async (req, res, next) => {
  try {
    const user = req.user;
    let {
      expensedate,
      market,
      store,
      category,
      amount,
      uploadurl,
      comment,
      username,
      managername,
    } = req.body;

    if (user.role === ROLES.MARKET_MANAGER) market = user.market;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expensedate)))
      return res.status(400).json({ error: "Invalid date format" });

    const unique_id = `${market || ""}${store || ""}${expensedate || ""}`
      .replace(/\s+/g, "")
      .toLowerCase();

    const sql = `
      INSERT INTO expenses
      (expense_date, market, store, category, amount, upload_url, comment, status, unique_id, managername, username)
      VALUES ($1,$2,$3,$4,CAST(NULLIF($5,'') AS NUMERIC),$6,$7,'pending',$8,$9,$10)
      RETURNING *
    `;
    const { rows } = await db.query(sql, [
      expensedate,
      market,
      store,
      category,
      amount,
      uploadurl,
      comment,
      unique_id,
      managername || user.fullName,
      username || user.email,
    ]);
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// 3. APPROVE EXPENSE
exports.approveExpense = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE expenses SET status = 'approved', reason = $2 WHERE id = $1 RETURNING *`,
      [req.params.id, req.body.reason || ""],
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// 4. REJECT EXPENSE (With Notifications)
exports.rejectExpense = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE expenses SET status = 'rejected', reason = $2 WHERE id = $1 RETURNING *`,
      [req.params.id, req.body.reason || ""],
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }

    const item = rows[0];
    const message = `Expense of $${item.amount} for ${item.store || "store"} was rejected. Reason: ${req.body.reason}`;
    await client.query(
      `INSERT INTO notifications (market, store, message, type) VALUES ($1, $2, $3, 'rejection')`,
      [
        item.market?.toLowerCase().trim(),
        item.store?.toLowerCase().trim(),
        message,
      ],
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

// 5. AUDIT EXPENSE
exports.auditExpense = async (req, res, next) => {
  try {
    const auditorName = req.user.fullName || req.user.email;
    const { rows } = await db.query(
      `UPDATE expenses SET audit_status = 'audited', audit_by = $2 WHERE id = $1 RETURNING *`,
      [req.params.id, auditorName],
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};
