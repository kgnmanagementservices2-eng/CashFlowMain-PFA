// src/controllers/market-cash.controller.js
const db = require("../config/db");
const { ROLES } = require("../middleware/rbac");

const hasGlobalAccess = (role) =>
  [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);

// --- 1. GET HISTORICAL BALANCE ---
exports.getHistoricalBalance = async (req, res, next) => {
  try {
    const { market, date } = req.query;

    if (!market || !date) {
      return res.status(400).json({ error: "Market and date are required." });
    }

    // Isolation Guard
    if (
      !hasGlobalAccess(req.user.role) &&
      req.user.market.toLowerCase() !== market.toLowerCase()
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: Cannot access other market data." });
    }

    const marketParam = market.trim().toLowerCase();
    const params = [marketParam, date];

    const salesQuery = `
      SELECT
        SUM(CAST(NULLIF(trim(pos_cash::text), '') AS numeric)) as total_sales,
        SUM(CAST(NULLIF(trim(cashinbank::text), '') AS numeric)) as total_bank
      FROM pos_data
      WHERE market IS NOT NULL AND lower(trim(market)) = $1 AND date <= $2
    `;

    const expensesQuery = `
      SELECT SUM(CAST(NULLIF(trim(amount::text), '') AS numeric)) as total_expenses
      FROM expenses
      WHERE market IS NOT NULL AND lower(trim(market)) = $1 AND expense_date <= $2 AND status = 'approved'
    `;

    const payrollQuery = `
      SELECT SUM(CAST(NULLIF(trim(amount::text), '') AS numeric)) as total_payroll
      FROM payroll_expenses
      WHERE market IS NOT NULL AND lower(trim(market)) = $1 AND date <= $2 AND status = 'approved'
    `;

    const pickupsQuery = `
      SELECT SUM(CAST(NULLIF(trim(COALESCE(total_amount, cash_entry, 0.0)::text), '') AS numeric)) as total_pickups
      FROM market_cash_wallet
      WHERE market IS NOT NULL AND lower(trim(market)) = $1 AND date <= $2 AND status = 'approved' AND audit_status = 'audited'
    `;

    const [salesRes, expRes, payRes, pickRes] = await Promise.all([
      db.query(salesQuery, params),
      db.query(expensesQuery, params),
      db.query(payrollQuery, params),
      db.query(pickupsQuery, params),
    ]);

    const totalSales = Number(salesRes.rows[0]?.total_sales || 0);
    const totalBank = Number(salesRes.rows[0]?.total_bank || 0);
    const totalExpenses = Number(expRes.rows[0]?.total_expenses || 0);
    const totalPayroll = Number(payRes.rows[0]?.total_payroll || 0);
    const totalPickups = Number(pickRes.rows[0]?.total_pickups || 0);

    const allExpenses = totalExpenses + totalPayroll;
    let cashInHand = totalSales - (totalBank + allExpenses + totalPickups);

    res.json({
      market,
      date_up_to: date,
      carry_forward: cashInHand,
      debug: {
        totalSales,
        totalBank,
        totalExpenses,
        totalPayroll,
        totalPickups,
      },
    });
  } catch (e) {
    console.error("Historical Balance Error:", e.message);
    res.status(500).json({ error: e.message });
  }
};

// --- 2. GET ALL MARKET CASH (PAGINATED & SEARCHABLE) ---
exports.getMarketCash = async (req, res, next) => {
  try {
    const {
      store,
      date,
      status,
      audit_status,
      date_from,
      date_to,
      specific_dates,
      search,
    } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    let targetMarket = req.query.market;
    if (!hasGlobalAccess(req.user.role)) targetMarket = req.user.market;

    let whereClauses = ["1=1"];
    let params = [];

    // Market & Store
    if (targetMarket) {
      params.push(targetMarket.trim().toLowerCase());
      whereClauses.push(`LOWER(TRIM(market)) = $${params.length}`);
    }
    if (store) {
      params.push(`%${store.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(store) LIKE $${params.length}`);
    }

    // Status Filters
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

    // 🔥 MUTUALLY EXCLUSIVE DATE LOGIC
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

    // 🔥 SERVER-SIDE SEARCH
    if (search) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        market ILIKE $${searchIdx} OR 
        store ILIKE $${searchIdx} OR
        notes ILIKE $${searchIdx} OR
        reason ILIKE $${searchIdx}
      )`);
    }

    // 🔥 GRAND TOTALS & AVAILABLE DATES (Ignores Pagination)
    const countSql = `
      SELECT 
        COUNT(*) as total_records, 
        COALESCE(SUM(CAST(cash_entry AS NUMERIC)), 0) as total_cash_entry,
        COALESCE(SUM(CAST(carry_forwarded_amount AS NUMERIC)), 0) as total_carry_forward,
        COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0) as grand_total,
        ARRAY_AGG(DISTINCT TO_CHAR(date, 'YYYY-MM-DD')) as available_dates
      FROM market_cash_wallet 
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    const totals = {
      cash_entry: parseFloat(countRows[0].total_cash_entry),
      carry_forward: parseFloat(countRows[0].total_carry_forward),
      total_amount: parseFloat(countRows[0].grand_total),
    };

    // Safely add pagination limits
    params.push(limit, offset);

    const sql = `
      SELECT 
        id, date, market, store,
        cash_entry, carry_forwarded_amount, total_amount,
        notes, status, reason,
        audit_status, audit_by, created_at
      FROM market_cash_wallet
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY date DESC, created_at DESC
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
    console.error("❌ Market cash fetch error:", e.message);
    next(e);
  }
};

// --- 3. CREATE MARKET CASH ---
exports.createMarketCash = async (req, res, next) => {
  try {
    let { date, market, store, cash_entry, carry_forwarded_amount, notes } =
      req.body;

    if (req.user.role === ROLES.MARKET_MANAGER) market = req.user.market;

    if (!date || !market)
      return res.status(400).json({ error: "Date and Market are required." });

    const sql = `
      INSERT INTO market_cash_wallet
        (date, market, store, cash_entry, carry_forwarded_amount, total_amount, notes, status, audit_status)
      VALUES (
        $1, $2, $3, 
        NULLIF($4, '')::numeric, 
        NULLIF($5, '')::numeric, 
        COALESCE(NULLIF($4, '')::numeric, 0) + COALESCE(NULLIF($5, '')::numeric, 0), 
        $6, 'pending', 'pending'
      )
      RETURNING *
    `;

    const params = [
      date,
      market.trim(),
      store ? store.trim() : null,
      cash_entry,
      carry_forwarded_amount,
      notes || null,
    ];
    const { rows } = await db.query(sql, params);
    return res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// --- 4. APPROVE ---
exports.approveMarketCash = async (req, res, next) => {
  try {
    const sql = `UPDATE market_cash_wallet SET status = 'approved', reason = $2 WHERE id = $1 RETURNING *`;
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

// --- 5. REJECT ---
exports.rejectMarketCash = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const reason = req.body.reason || "";
    await client.query("BEGIN");

    const sql = `UPDATE market_cash_wallet SET status = 'rejected', reason = $2 WHERE id = $1 RETURNING *`;
    const { rows } = await client.query(sql, [req.params.id, reason]);

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }

    const item = rows[0];
    const message = `Market Wallet Entry of $${item.total_amount} for ${item.store || "store"} was rejected. Reason: ${reason}`;
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

// --- 6. AUDIT ---
exports.auditMarketCash = async (req, res, next) => {
  try {
    const sql = `UPDATE market_cash_wallet SET audit_status = 'audited', audit_by = $2 WHERE id = $1 RETURNING *`;
    const { rows } = await db.query(sql, [req.params.id, req.user.email]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};
