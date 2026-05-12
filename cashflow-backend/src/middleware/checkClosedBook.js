const db = require("../config/db");

const checkClosedBook = async (req, res, next) => {
  try {
    // 1. Grab the date and market from the request body
    // Handles different naming conventions across your forms
    const targetDate =
      req.body.date || req.body.expense_date || req.body.expensedate;
    const market = req.body.market;

    // If there is no date or market in the payload, skip the check
    if (!targetDate || !market) {
      return next();
    }

    // 🔥 THE FIX: Safe String Slicing!
    // Takes "2026-01-01" or "2026-01-15T00:00:00" and safely extracts "2026-01-01"
    // This completely prevents JavaScript from shifting the month backwards!
    const targetMonthStart = targetDate.substring(0, 7) + "-01";
    const marketParam = market.toLowerCase().trim();

    // Check if a record exists for this exact month and market
    const sql = `
      SELECT id FROM monthly_reconciliations 
      WHERE lower(trim(market)) = $1 
      AND CAST(reconciliation_month AS TEXT) LIKE $2
      LIMIT 1
    `;

    // We use LIKE '2026-01%' to safely match the database timestamp
    const { rows } = await db.query(sql, [
      marketParam,
      `${targetDate.substring(0, 7)}%`,
    ]);

    // If a record exists, the book is closed! Block the request.
    if (rows.length > 0) {
      // Returning 400 prevents the frontend from auto-logging out the user
      return res.status(400).json({
        error: "BOOK_CLOSED",
        message: "Book closed for the month. Contact admin.",
      });
    }

    // Book is open, proceed to the controller
    next();
  } catch (err) {
    console.error("Closed book check error:", err);
    // If the check fails, default to allowing the request through so we don't break the app
    next();
  }
};

module.exports = checkClosedBook;
