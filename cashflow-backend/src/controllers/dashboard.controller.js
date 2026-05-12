// src/controllers/dashboard.controller.js
const db = require("../config/db");
const { ROLES } = require("../middleware/rbac");

const hasGlobalAccess = (role) =>
  [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);

exports.getDashboardData = async (req, res, next) => {
  try {
    const { market, store, date_from, date_to, specific_dates, search } =
      req.query;

    // Pagination Params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    let targetMarket = market;
    if (!hasGlobalAccess(req.user.role)) targetMarket = req.user.market;

    const baseParams = [];
    const filterRefs = {};
    let pIdx = 1;

    if (targetMarket) {
      filterRefs.market = `$${pIdx++}`;
      baseParams.push(targetMarket.toLowerCase().trim());
    }
    if (store) {
      filterRefs.store = `$${pIdx++}`;
      baseParams.push(store.toLowerCase().trim());
    }

    // 🔥 Mutually Exclusive Dates
    if (specific_dates) {
      const dateList = specific_dates.split(",").map((d) => d.trim());
      const placeholders = [];
      for (const d of dateList) {
        baseParams.push(d);
        placeholders.push(`$${pIdx++}`);
      }
      filterRefs.specific_dates = placeholders.join(",");
    } else {
      if (date_from) {
        filterRefs.date_from = `$${pIdx++}`;
        baseParams.push(date_from);
      }
      if (date_to) {
        filterRefs.date_to = `$${pIdx++}`;
        baseParams.push(date_to);
      }
    }

    const buildFilter = (fieldDate, fieldStore) => {
      let clauses = ["1=1"];
      if (filterRefs.market)
        clauses.push(`LOWER(TRIM(market)) = ${filterRefs.market}`);
      if (filterRefs.store)
        clauses.push(`LOWER(TRIM(${fieldStore})) = ${filterRefs.store}`);
      if (filterRefs.specific_dates)
        clauses.push(`${fieldDate} IN (${filterRefs.specific_dates})`);
      else {
        if (filterRefs.date_from)
          clauses.push(`${fieldDate} >= ${filterRefs.date_from}`);
        if (filterRefs.date_to)
          clauses.push(`${fieldDate} <= ${filterRefs.date_to}`);
      }
      return clauses.join(" AND ");
    };

    const salesFilter = buildFilter("date", "store_id");
    const expFilter = buildFilter("expense_date", "store");
    const payFilter = buildFilter("date", "store");
    const cashFilter = buildFilter("date", "store");

    let combinedSearchClause = "";
    const sqlParams = [...baseParams];
    if (search) {
      sqlParams.push(`%${search.trim()}%`);
      combinedSearchClause = `WHERE (market ILIKE $${pIdx} OR store ILIKE $${pIdx})`;
    }

    const sql = `
      WITH sales AS (
        SELECT date, LOWER(TRIM(market)) AS market, LOWER(TRIM(store_id)) AS store,
        SUM(CAST(pos_cash AS NUMERIC)) AS s_cash, SUM(CAST(pos_debit AS NUMERIC)) AS s_debit, SUM(CAST(qpay_payment AS NUMERIC)) AS s_qpay, SUM(CAST(cashinbank AS NUMERIC)) AS cash_in_bank
        FROM pos_data WHERE ${salesFilter} GROUP BY date, LOWER(TRIM(market)), LOWER(TRIM(store_id))
      ),
      expenses AS (
        SELECT expense_date AS date, LOWER(TRIM(market)) AS market, LOWER(TRIM(store)) AS store, SUM(CAST(amount AS NUMERIC)) AS expense_other
        FROM expenses WHERE ${expFilter} AND status='approved' AND audit_status='audited' AND LOWER(category) NOT IN ('payroll','commission') 
        GROUP BY expense_date, LOWER(TRIM(market)), LOWER(TRIM(store))
      ),
      payroll AS (
        SELECT date, LOWER(TRIM(market)) AS market, LOWER(TRIM(store)) AS store, SUM(CAST(add_amount_by_mm AS NUMERIC)) AS expense_payroll
        FROM payroll_expenses WHERE ${payFilter} AND status='approved' AND audit_status='audited' AND LOWER(category)='payroll' AND payment_status = 'paid'
        GROUP BY date, LOWER(TRIM(market)), LOWER(TRIM(store))
      ),
commission AS (
  SELECT 
    date, 
    LOWER(TRIM(market)) AS market, 
    LOWER(TRIM(store)) AS store, 
    SUM(CAST(add_amount_by_mm AS NUMERIC)) AS expense_commission
  FROM commission_data
  WHERE ${payFilter}
    AND status = 'approved'
    AND audit_status = 'audited'
    AND payment_status = 'paid'
  GROUP BY date, LOWER(TRIM(market)), LOWER(TRIM(store))
),
      cash AS (
        SELECT date, LOWER(TRIM(market)) AS market, LOWER(TRIM(store)) AS store, SUM(CAST(cash_entry AS NUMERIC)) AS pickup
        FROM market_cash_wallet WHERE ${cashFilter} AND status='approved' AND audit_status='audited'
        GROUP BY date, LOWER(TRIM(market)), LOWER(TRIM(store))
      ),
      combined AS (
        SELECT
          COALESCE(s.date,e.date,p.date,c.date,ca.date) AS date,
          COALESCE(s.market,e.market,p.market,c.market,ca.market) AS market,
          COALESCE(s.store,e.store,p.store,c.store,ca.store) AS store,
          COALESCE(s.s_cash,0) AS sales_cash,
          (COALESCE(s.s_debit,0) + COALESCE(s.s_qpay,0)) AS sales_card,
          COALESCE(s.s_cash,0) AS sales_total,
          COALESCE(s.cash_in_bank,0) AS cash_in_bank,
          COALESCE(e.expense_other,0) AS expense_other,
          COALESCE(p.expense_payroll,0) AS expense_payroll,
          COALESCE(c.expense_commission,0) AS expense_commission,
          COALESCE(ca.pickup,0) AS pickup
        FROM sales s
        FULL OUTER JOIN expenses e USING(date,market,store)
        FULL OUTER JOIN payroll p USING(date,market,store)
        FULL OUTER JOIN commission c USING(date,market,store)
        FULL OUTER JOIN cash ca USING(date,market,store)
      )
      SELECT * FROM combined ${combinedSearchClause} ORDER BY date DESC, market, store;`;

    const categorySql = `
      SELECT category, SUM(CAST(amount AS NUMERIC)) as amount FROM expenses 
      WHERE ${expFilter} AND status='approved' AND audit_status='audited' AND LOWER(category) NOT IN ('payroll','commission') 
      GROUP BY category`;

    const [mainResult, catResult] = await Promise.all([
      db.query(sql, sqlParams),
      db.query(categorySql, baseParams),
    ]);

    const expenseCategories = {};
    catResult.rows.forEach((r) => {
      const cat = r.category
        ? r.category.charAt(0).toUpperCase() + r.category.slice(1)
        : "Other";
      expenseCategories[cat] = Number(r.amount || 0);
    });

    // ==========================================
    // 🔥 NEW: FETCH OPENING BALANCE EFFICIENTLY
    // ==========================================
    let openingBalance = 0;
    let earliestDate =
      date_from ||
      (specific_dates ? specific_dates.split(",")[0].trim() : null);

    if (earliestDate) {
      // 🔥 CRITICAL FIX: Use substring to prevent JavaScript Timezone shifts!
      // Takes "2026-09-01" or "2026-09-15" and forces it safely to "2026-09-01"
      const currentMonthStart = earliestDate.substring(0, 7) + "-01";

      let obSql;
      let obParams = [currentMonthStart];

      if (targetMarket) {
        // Find balance for specific market
        obSql = `
          SELECT opening_balance
          FROM monthly_reconciliations
          WHERE lower(trim(market)) = $2 AND reconciliation_month < $1
          ORDER BY reconciliation_month DESC LIMIT 1
        `;
        obParams.push(targetMarket.toLowerCase().trim());
      } else {
        // Sum latest balance across ALL markets if no market is selected
        obSql = `
          SELECT SUM(opening_balance) as opening_balance
          FROM (
            SELECT opening_balance,
                   ROW_NUMBER() OVER(PARTITION BY market ORDER BY reconciliation_month DESC) as rn
            FROM monthly_reconciliations
            WHERE reconciliation_month < $1
          ) sub WHERE rn = 1
        `;
      }

      const obRes = await db.query(obSql, obParams);
      openingBalance = Number(obRes.rows[0]?.opening_balance || 0);
    }
    // ==========================================

    let totals = {
      sales: 0,
      sales_total: 0,
      bank: 0,
      expenses: 0,
      expense_other: 0,
      payroll: 0,
      expense_payroll: 0,
      commission: 0,
      expense_commission: 0,
      pickup: 0,
      variance: 0,
      expense_total: 0,
      net: 0,
      cash_in_bank: 0,
      opening_balance: openingBalance, // 🔥 NOW INCLUDED IN DASHBOARD TOTALS!
    };
    const charts = {
      dailyCash: {},
      dailyCard: {},
      payroll: {},
      expenseCategories,
    };
    const availableDatesSet = new Set();

    // Calculate Totals & Charts Before Pagination
    const processedRows = mainResult.rows.map((r) => {
      const dStr = r.date ? new Date(r.date).toISOString().split("T")[0] : null;
      if (dStr) availableDatesSet.add(dStr);

      const s_cash = Number(r.sales_cash || 0);
      const s_card = Number(r.sales_card || 0);
      const s_total = Number(r.sales_total || 0);
      const c_bank = Number(r.cash_in_bank || 0);
      const e_other = Number(r.expense_other || 0);
      const e_pay = Number(r.expense_payroll || 0);
      const e_comm = Number(r.expense_commission || 0);
      const pickup = Number(r.pickup || 0);

      const e_total = e_other + e_pay + e_comm;
      const net = s_total - e_total;
      const variance = c_bank - net;

      // Populate Grand Totals
      totals.sales += s_total;
      totals.sales_total += s_total;
      totals.bank += c_bank;
      totals.cash_in_bank += c_bank;
      totals.expenses += e_other;
      totals.expense_other += e_other;
      totals.payroll += e_pay;
      totals.expense_payroll += e_pay;
      totals.commission += e_comm;
      totals.expense_commission += e_comm;
      totals.pickup += pickup;
      totals.expense_total += e_total;
      totals.net += net;
      totals.variance += variance;

      // Populate Charts
      if (dStr) {
        charts.dailyCash[dStr] = (charts.dailyCash[dStr] || 0) + s_cash;
        charts.dailyCard[dStr] = (charts.dailyCard[dStr] || 0) + s_card;
        if (!charts.payroll[dStr]) charts.payroll[dStr] = {};
        charts.payroll[dStr]["Payroll"] =
          (charts.payroll[dStr]["Payroll"] || 0) + e_pay;
        charts.payroll[dStr]["Commission"] =
          (charts.payroll[dStr]["Commission"] || 0) + e_comm;
      }

      return {
        unique_id: `${r.market}_${r.store}_${dStr}`,
        date: dStr,
        market: r.market || "",
        store: r.store || "",
        pos_cash: s_cash,
        pos_card: s_card,
        qpay: 0,
        sales_total: s_total,
        expense_other: e_other,
        expense_payroll: e_pay,
        expense_commission: e_comm,
        expense_total: e_total,
        net: net,
        cash_in_bank: c_bank,
        variance: variance,
      };
    });

    // Apply Server-Side Pagination
    const offset = (page - 1) * limit;
    const paginatedRows = processedRows.slice(offset, offset + limit);

    res.json({
      data: paginatedRows,
      summary: {
        totals,
        availableDates: Array.from(availableDatesSet).sort(),
      },
      charts,
      pagination: {
        total: processedRows.length,
        page,
        limit,
        totalPages: Math.ceil(processedRows.length / limit),
      },
      approvals: {
        expenses: await getApprovalStats(db, "expenses", expFilter, baseParams),
        payroll: await getApprovalStats(
          db,
          "payroll_expenses",
          payFilter + " AND LOWER(category)='payroll'",
          baseParams,
        ),
        commission: await getApprovalStats(
          db,
          "commission_data",
          payFilter,
          baseParams,
        ),
      },
    });
  } catch (e) {
    console.error("❌ Dashboard error:", e.message);
    next(e);
  }
};

async function getApprovalStats(db, table, filter, params) {
  const amountField =
    table === "commission_data" ? "final_commission" : "amount";

  const sql = `
    SELECT status, COUNT(*) as count, 
    SUM(CAST(${amountField} AS NUMERIC)) as amount 
    FROM ${table} 
    WHERE ${filter} 
    GROUP BY status
  `;

  const { rows } = await db.query(sql, params);

  const result = {
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
  };

  rows.forEach((r) => {
    const s = (r.status || "").toLowerCase();
    if (result[s]) {
      result[s] = {
        count: Number(r.count),
        amount: Number(r.amount || 0),
      };
    }
  });

  return result;
}

exports.getPendingCounts = async (req, res) => {
  try {
    const { market } = req.query;

    const params = [];
    let marketFilter = "";

    if (market) {
      params.push(market.toLowerCase().trim());
      marketFilter = `AND LOWER(TRIM(market)) = $${params.length}`;
    }

    const [expenses, payroll, commission] = await Promise.all([
      db.query(
        `SELECT COUNT(*) FROM expenses WHERE status='pending' ${marketFilter}`,
        params,
      ),
      db.query(
        `SELECT COUNT(*) FROM payroll_expenses WHERE status='pending' AND LOWER(category)='payroll' ${marketFilter}`,
        params,
      ),
      db.query(
        `SELECT COUNT(*) FROM commission_data WHERE status='pending' ${marketFilter}`,
        params,
      ),
    ]);

    res.json({
      success: true,
      data: {
        expenses: Number(expenses.rows[0].count || 0),
        payroll: Number(payroll.rows[0].count || 0),
        commission: Number(commission.rows[0].count || 0),
      },
    });
  } catch (err) {
    console.error("Pending counts error:", err);
    res.status(500).json({ success: false });
  }
};
