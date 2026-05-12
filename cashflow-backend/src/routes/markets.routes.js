// src/routes/markets.routes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db"); // Your pg pool

// Import the middlewares
const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");

// Route: Get all markets
// Only global roles can hit this endpoint to populate their Market Dropdowns
router.get(
  "/all",
  authenticateToken,
  // 🛡️ CRITICAL FIX: Updated to match unified roles and added SUPER_ADMIN
  authorizeRoles(
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ),
  async (req, res) => {
    try {
      // Because the middleware already blocked market managers,
      // we don't need IF/ELSE logic here anymore!
      const sql = `
        SELECT DISTINCT initcap(TRIM(market)) AS market
        FROM all_info
        WHERE market IS NOT NULL AND TRIM(market) <> ''
        ORDER BY initcap(TRIM(market))
      `;
      const { rows } = await db.query(sql);
      res.json(rows.map((r) => r.market));
    } catch (e) {
      console.error("markets list error:", e);
      res.status(500).json({ error: "Failed to load markets" });
    }
  },
);

module.exports = router;
