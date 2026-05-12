// src/controllers/reconciliation.controller.js
const db = require("../config/db");

// 1. Get all closed months for a market
exports.getReconciliations = async (req, res, next) => {
  try {
    const { market } = req.query;
    let sql = `SELECT * FROM monthly_reconciliations ORDER BY reconciliation_month DESC`;
    let params = [];

    if (market) {
      sql = `SELECT * FROM monthly_reconciliations WHERE lower(trim(market)) = $1 ORDER BY reconciliation_month DESC`;
      params.push(market.toLowerCase().trim());
    }

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

// 2. Get the Opening Balance for a specific month (from the previously closed month)
exports.getOpeningBalance = async (req, res, next) => {
  try {
    const { market, year, month } = req.query;

    if (!market || !year || !month) {
      return res.json({ openingBalance: 0 });
    }

    // This represents the 1st day of the current month we are viewing
    const currentMonthStart = `${year}-${String(month).padStart(2, "0")}-01`;

    // Fetch the most recent closed month strictly BEFORE the current month
    const sql = `
      SELECT opening_balance
      FROM monthly_reconciliations
      WHERE lower(trim(market)) = $1
        AND reconciliation_month < $2
      ORDER BY reconciliation_month DESC
      LIMIT 1
    `;

    const { rows } = await db.query(sql, [
      market.toLowerCase().trim(),
      currentMonthStart,
    ]);

    // Return the stored balance (which is already formatted by the closeBook logic)
    const balance = rows.length ? Number(rows[0].opening_balance) : 0;

    res.json({ openingBalance: balance });
  } catch (e) {
    console.error("Error fetching opening balance:", e);
    next(e);
  }
};

// 3. Close the Book
exports.closeBook = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { market, year, month } = req.body;
    const adminEmail = req.user.email;
    const marketParam = market.trim().toLowerCase();

    // The first day of the month (e.g., '2026-03-01')
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    // Format for SQL LIKE to match the month (e.g., '2026-03%')
    const monthLike = `${year}-${String(month).padStart(2, "0")}%`;

    await client.query("BEGIN");

    // --- STEP 1: Fetch Previous Month's Carry Forward Balance ---
    const prevMonthSql = `
      SELECT opening_balance FROM monthly_reconciliations
      WHERE lower(trim(market)) = $1 AND reconciliation_month < $2
      ORDER BY reconciliation_month DESC LIMIT 1
    `;
    const prevMonthRes = await client.query(prevMonthSql, [
      marketParam,
      monthStart,
    ]);
    const previousBalance = prevMonthRes.rows.length
      ? Number(prevMonthRes.rows[0].opening_balance)
      : 0;

    // --- STEP 2: Calculate the totals for the CURRENT month ---
    const salesQ = `SELECT SUM(CAST(pos_cash AS NUMERIC)) as total FROM pos_data WHERE lower(trim(market)) = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`;
    const bankQ = `SELECT SUM(CAST(cashinbank AS NUMERIC)) as total FROM pos_data WHERE lower(trim(market)) = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`;
    const expQ = `SELECT SUM(CAST(amount AS NUMERIC)) as total FROM expenses WHERE lower(trim(market)) = $1 AND TO_CHAR(expense_date, 'YYYY-MM') = $2 AND status='approved'`;
    const payQ = `SELECT SUM(CAST(amount AS NUMERIC)) as total FROM payroll_expenses WHERE lower(trim(market)) = $1 AND TO_CHAR(date, 'YYYY-MM') = $2 AND status='approved'`;
    const comQ = `SELECT SUM(CAST(final_commission AS NUMERIC)) as total FROM commission_data WHERE lower(trim(market)) = $1 AND TO_CHAR(date, 'YYYY-MM') = $2 AND status='approved'`;
    const pickQ = `SELECT SUM(CAST(cash_entry AS NUMERIC)) as total FROM market_cash_wallet WHERE lower(trim(market)) = $1 AND TO_CHAR(date, 'YYYY-MM') = $2 AND status='approved'`;

    const paramArr = [marketParam, `${year}-${String(month).padStart(2, "0")}`];

    const [salesRes, bankRes, expRes, payRes, pickRes, comRes] =
      await Promise.all([
        client.query(salesQ, paramArr),
        client.query(bankQ, paramArr),
        client.query(expQ, paramArr),
        client.query(payQ, paramArr),
        client.query(pickQ, paramArr),
        client.query(comQ, paramArr),
      ]);

    const totalSales = Number(salesRes.rows[0]?.total || 0);
    const totalBank = Number(bankRes.rows[0]?.total || 0);
    const totalExp = Number(expRes.rows[0]?.total || 0);
    const totalPay = Number(payRes.rows[0]?.total || 0);
    const totalPick = Number(pickRes.rows[0]?.total || 0);
    const totalComm = Number(comRes.rows[0]?.total || 0);

    // --- STEP 3: Calculate True Final Cash In Hand ---
    const totalExpenses = totalExp + totalPay + totalComm;
    const cashPickupCalc = totalSales - totalBank;
    const varience = cashPickupCalc - totalPick;

    // Exact match to your frontend formula: Prev Balance + ((Bank + Pickup + Expenses) - Sales)
    const finalCashInHand =
      previousBalance + (totalPick - totalExpenses) + varience;

    // --- STEP 4: APPLY CARRY FORWARD LOGIC ---
    // If Final Cash In Hand is negative (-100), carry forward as positive (100)
    // If Final Cash In Hand is positive or 0, carry forward is 0
    let carryForwardBalance = finalCashInHand;

    // --- STEP 5: Insert into Reconciliations table ---
    const insertSql = `
      INSERT INTO monthly_reconciliations (market, reconciliation_month, opening_balance, locked_by)
      VALUES ($1, $2, $3, $4) RETURNING *
    `;
    const { rows } = await client.query(insertSql, [
      marketParam,
      monthStart,
      carryForwardBalance,
      adminEmail,
    ]);

    // --- STEP 6: Lock the tables for that month ---
    const lockParams = [marketParam, monthLike];
    await client.query(
      `UPDATE expenses SET is_locked = TRUE WHERE lower(trim(market)) = $1 AND CAST(expense_date AS TEXT) LIKE $2`,
      lockParams,
    );
    await client.query(
      `UPDATE payroll_expenses SET is_locked = TRUE WHERE lower(trim(market)) = $1 AND CAST(date AS TEXT) LIKE $2`,
      lockParams,
    );
    await client.query(
      `UPDATE commission_data SET is_locked = TRUE WHERE lower(trim(market)) = $1 AND CAST(date AS TEXT) LIKE $2`,
      lockParams,
    );
    await client.query(
      `UPDATE market_cash_wallet SET is_locked = TRUE WHERE lower(trim(market)) = $1 AND CAST(date AS TEXT) LIKE $2`,
      lockParams,
    );
    await client.query(
      `UPDATE pos_data SET is_locked = TRUE WHERE lower(trim(market)) = $1 AND CAST(date AS TEXT) LIKE $2`,
      lockParams,
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      data: rows[0],
      finalCashInHand,
      carryForwardBalance,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "23505") {
      // Postgres Unique Violation Error Code
      return res.status(400).json({ error: "This month is already closed." });
    }
    next(e);
  } finally {
    client.release();
  }
};

// 4. Reopen the Book
exports.reopenBook = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");

    // Get the record to know which month/market to unlock
    const { rows } = await client.query(
      `SELECT * FROM monthly_reconciliations WHERE id = $1`,
      [id],
    );
    if (!rows.length) throw new Error("Record not found");

    const record = rows[0];
    const monthLike =
      record.reconciliation_month.toISOString().substring(0, 7) + "%"; // e.g., '2026-03%'
    const lockParams = [record.market, monthLike];

    // Unlock tables
    await client.query(
      `UPDATE expenses SET is_locked = FALSE WHERE lower(trim(market)) = $1 AND CAST(expense_date AS TEXT) LIKE $2`,
      lockParams,
    );
    await client.query(
      `UPDATE payroll_expenses SET is_locked = FALSE WHERE lower(trim(market)) = $1 AND CAST(date AS TEXT) LIKE $2`,
      lockParams,
    );
    await client.query(
      `UPDATE commission_data SET is_locked = FALSE WHERE lower(trim(market)) = $1 AND CAST(date AS TEXT) LIKE $2`,
      lockParams,
    );
    await client.query(
      `UPDATE market_cash_wallet SET is_locked = FALSE WHERE lower(trim(market)) = $1 AND CAST(date AS TEXT) LIKE $2`,
      lockParams,
    );
    await client.query(
      `UPDATE pos_data SET is_locked = FALSE WHERE lower(trim(market)) = $1 AND CAST(date AS TEXT) LIKE $2`,
      lockParams,
    );

    // Remove the record
    await client.query(`DELETE FROM monthly_reconciliations WHERE id = $1`, [
      id,
    ]);

    await client.query("COMMIT");
    res.json({ success: true, message: "Book reopened successfully." });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
};
