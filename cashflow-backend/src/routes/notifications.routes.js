// src/routes/notifications.routes.js

const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const { ROLES } = require("../middleware/rbac");

// Roles with global access
const hasGlobalAccess = (role) =>
  [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);

// --- GET NOTIFICATIONS ---
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    let targetMarket = req.query.market;

    // 🔐 MARKET ISOLATION
    if (!hasGlobalAccess(req.user.role)) {
      targetMarket = req.user.market;
    }

    // 🛑 SAFETY CHECK
    if (!targetMarket) {
      console.log("❌ No market found for user");
      return res.json([]);
    }

    // ✅ NORMALIZE MARKET (VERY IMPORTANT)
    targetMarket = targetMarket.toLowerCase().trim();

    let sql = `
      SELECT *
      FROM notifications
      WHERE is_read = false
      AND LOWER(TRIM(market)) = LOWER(TRIM($1))
      ORDER BY created_at DESC
    `;

    const { rows } = await db.query(sql, [targetMarket]);

    res.json(rows);
  } catch (err) {
    console.error(" Notification fetch error:", err.message);
    next(err);
  }
});

// --- DISMISS NOTIFICATION ---
router.post("/:id/dismiss", authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;

    await db.query("UPDATE notifications SET is_read = true WHERE id = $1", [
      id,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Dismiss error:", err.message);
    next(err);
  }
});
// --- CLEAR ALL NOTIFICATIONS ---
router.post("/clear-all", authenticateToken, async (req, res, next) => {
  try {
    let targetMarket = req.body.market;

    if (!hasGlobalAccess(req.user.role)) {
      targetMarket = req.user.market;
    }

    if (!targetMarket) {
      return res.json({ success: false });
    }

    targetMarket = targetMarket.toLowerCase().trim();

    await db.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE LOWER(TRIM(market)) = LOWER(TRIM($1)) 
       AND is_read = false`,
      [targetMarket],
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Clear all error:", err.message);
    next(err);
  }
});

module.exports = router;
