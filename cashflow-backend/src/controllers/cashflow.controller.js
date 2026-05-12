// src/controllers/cashflow.controller.js
const db = require("../config/db");
const { ROLES } = require("../middleware/rbac");

const hasGlobalAccess = (role) =>
  [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);

// --- 1. GET ALL CASHFLOW (TILL) RECORDS ---
exports.getCashflow = async (req, res, next) => {
  try {
    // Note: Frontend might send 'store' instead of 'store_name' depending on API setup
    const store_name = req.query.store_name || req.query.store;
    const { date, date_from, date_to, specific_dates, search } = req.query;

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
    if (store_name) {
      params.push(`%${store_name.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(TRIM(store_name)) LIKE $${params.length}`);
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
        store_name ILIKE $${searchIdx}
      )`);
    }

    // 🔥 GRAND TOTALS & AVAILABLE DATES (Ignores Pagination limits)
    const countSql = `
      SELECT 
        COUNT(*) as total_records, 
        COALESCE(SUM(CAST(NULLIF(trim(cash_at_start::text), '') AS NUMERIC)), 0) as total_start,
        COALESCE(SUM(CAST(NULLIF(trim(cash_at_end::text), '') AS NUMERIC)), 0) as total_end,
        COALESCE(SUM(CAST(NULLIF(trim(carry_forward::text), '') AS NUMERIC)), 0) as total_cf,
        ARRAY_AGG(DISTINCT TO_CHAR(date, 'YYYY-MM-DD')) as available_dates
      FROM cashflow 
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    const totals = {
      start: parseFloat(countRows[0].total_start),
      end: parseFloat(countRows[0].total_end),
      cf: parseFloat(countRows[0].total_cf),
    };

    // Push Pagination Limits to Params safely
    params.push(limit, offset);

    const sql = `
      SELECT date, market, store_name, cash_at_start, cash_at_end, carry_forward
      FROM cashflow
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY date DESC, market, store_name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await db.query(sql, params);

    // Return structured payload
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
    console.error("❌ Cashflow fetch error:", e.message);
    next(e);
  }
};

// --- 2. CREATE CASHFLOW (TILL) RECORD ---
exports.createCashflow = async (req, res, next) => {
  try {
    let {
      date,
      market,
      store_name,
      cash_at_start,
      cash_at_end,
      carry_forward,
    } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }

    // 🛡️ INBOUND ISOLATION GUARD 🛡️
    if (req.user.role === ROLES.MARKET_MANAGER) {
      if (market && market.toLowerCase() !== req.user.market.toLowerCase()) {
        return res
          .status(403)
          .json({ error: "Cannot submit till data for another market." });
      }
      market = req.user.market; // Force their market
    }

    if (!market || !store_name) {
      return res
        .status(400)
        .json({ error: "market and store_name are required" });
    }

    const sql = `
      INSERT INTO cashflow (date, market, store_name, cash_at_start, cash_at_end, carry_forward)
      VALUES ($1, $2, $3, NULLIF($4, '')::numeric, NULLIF($5, '')::numeric, NULLIF($6, '')::numeric)
      RETURNING date, market, store_name, cash_at_start, cash_at_end, carry_forward
    `;

    const params = [
      date,
      market.trim(),
      store_name.trim(),
      cash_at_start,
      cash_at_end,
      carry_forward,
    ];

    const { rows } = await db.query(sql, params);
    return res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
};
