// src/controllers/variance.controller.js
const db = require("../config/db");
const { ROLES } = require("../middleware/rbac");

const hasGlobalAccess = (role) =>
  [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);

exports.getVariance = async (req, res, next) => {
  try {
    const { store, date, date_from, date_to, specific_dates, search, status } =
      req.query;

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
    if (status && status.toLowerCase() !== "all") {
      params.push(status.trim().toLowerCase());
      whereClauses.push(`LOWER(TRIM(status)) = LOWER(TRIM($${params.length}))`);
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
        dm_name ILIKE $${searchIdx} OR
        reason ILIKE $${searchIdx} OR
        approved_by ILIKE $${searchIdx}
      )`);
    }

    // 🔥 GRAND TOTALS & AVAILABLE DATES (Ignores Pagination limits)
    const countSql = `
      SELECT 
        COUNT(*) as total_records, 
        COALESCE(SUM(CAST(variance_amount AS NUMERIC)), 0) as total_variance,
        COALESCE(SUM(CAST(resolved_amount AS NUMERIC)), 0) as total_resolved,
        COALESCE(SUM(CAST(pending_amount AS NUMERIC)), 0) as total_pending,
        ARRAY_AGG(DISTINCT TO_CHAR(date, 'YYYY-MM-DD')) as available_dates
      FROM variance_data 
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    const totals = {
      variance: parseFloat(countRows[0].total_variance),
      resolved: parseFloat(countRows[0].total_resolved),
      pending: parseFloat(countRows[0].total_pending),
    };

    // Push Pagination Limits to Params safely
    params.push(limit, offset);

    // 🚀 FIXED: Removed "id" from the SELECT statement
    const sql = `
      SELECT
        date, market, store, dm_name,
        variance_amount, resolved_amount, pending_amount,
        reason, approved_by, status, chargeback_per_head,
        responsible_employee_names, responsible_employee_ntid,
        back_office_comment, audit_by_arjun
      FROM variance_data
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY date DESC, market, store
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
    console.error("❌ Variance fetch error:", e.message);
    next(e);
  }
};
