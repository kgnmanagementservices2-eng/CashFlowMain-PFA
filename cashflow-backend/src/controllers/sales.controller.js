// src/controllers/sales.controller.js
const db = require("../config/db");
const { ROLES } = require("../middleware/rbac");

const hasGlobalAccess = (role) =>
  [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);

exports.getSales = async (req, res, next) => {
  try {
    const { store, date, date_from, date_to, specific_dates, search } =
      req.query;

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

    // Note: Database uses 'store_id'
    if (store) {
      params.push(store.trim().toLowerCase());
      whereClauses.push(
        `LOWER(TRIM(store_id)) = LOWER(TRIM($${params.length}))`,
      );
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
        store_id ILIKE $${searchIdx}
      )`);
    }

    // 🔥 GRAND TOTALS & AVAILABLE DATES (Ignores Pagination limits)
    const countSql = `
      SELECT 
        COUNT(*) as total_records, 
        COALESCE(SUM(CAST(pos_cash AS NUMERIC)), 0) as total_cash,
        COALESCE(SUM(CAST(pos_debit AS NUMERIC)), 0) as total_card,
        COALESCE(SUM(CAST(qpay_payment AS NUMERIC)), 0) as total_qpay,
        COALESCE(SUM(CAST(cashinbank AS NUMERIC)), 0) as total_bank,
        ARRAY_AGG(DISTINCT TO_CHAR(date, 'YYYY-MM-DD')) as available_dates
      FROM pos_data 
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    const totals = {
      cash: parseFloat(countRows[0].total_cash),
      card: parseFloat(countRows[0].total_card),
      qpay: parseFloat(countRows[0].total_qpay),
      cashinbank: parseFloat(countRows[0].total_bank),
      total_sales:
        parseFloat(countRows[0].total_cash) +
        parseFloat(countRows[0].total_card) +
        parseFloat(countRows[0].total_qpay),
    };

    // Push Pagination Limits to Params safely
    params.push(limit, offset);

    const sql = `
      SELECT
        date, market, store_id AS store, 
        CAST(pos_cash AS NUMERIC) AS pos_cash,
        CAST(pos_debit AS NUMERIC) AS pos_debit,
        CAST(qpay_payment AS NUMERIC) AS qpay_payment,
        CAST(cashinbank AS NUMERIC) AS cashinbank,
        unique_id
      FROM pos_data
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY date DESC, market, store_id
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
    console.error("❌ Sales fetch error:", e.message);
    next(e);
  }
};
