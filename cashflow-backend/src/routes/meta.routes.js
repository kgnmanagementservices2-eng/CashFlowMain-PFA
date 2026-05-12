// src/routes/meta.routes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const { ROLES } = require("../middleware/rbac");

// 🛡️ CRITICAL FIX: Updated to match unified roles and added SUPER_ADMIN
const hasGlobalAccess = (role) =>
  [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);

// GET /api/meta/markets
router.get("/markets", authenticateToken, async (req, res, next) => {
  try {
    let sql;
    const params = [];

    if (hasGlobalAccess(req.user.role)) {
      sql = `SELECT DISTINCT initcap(TRIM(market)) AS market FROM all_info WHERE TRIM(market) <> '' ORDER BY market`;
    } else if (req.user.market) {
      params.push(req.user.market.toLowerCase());
      sql = `SELECT DISTINCT initcap(TRIM(market)) AS market FROM all_info WHERE LOWER(TRIM(market)) = $1`;
    } else {
      return res.json([]);
    }

    const { rows } = await db.query(sql, params);
    res.json(rows.map((r) => r.market));
  } catch (e) {
    next(e);
  }
});

// GET /api/meta/stores
router.get("/stores", authenticateToken, async (req, res, next) => {
  try {
    let targetMarket = req.query.market;
    let where = "TRIM(STORE) <> '' AND TRIM(MARKET) <> ''";
    const params = [];

    // 🛡️ MARKET ISOLATION GUARD 🛡️
    if (!hasGlobalAccess(req.user.role)) {
      targetMarket = req.user.market; // Force to manager's market
    }

    if (targetMarket) {
      params.push(targetMarket.trim().toLowerCase());
      where += ` AND LOWER(TRIM(MARKET)) = $${params.length}`;
    }

    const sql = `
      SELECT DISTINCT 
        TRIM(STORE) AS code, 
        initcap(TRIM(STORE)) AS name, 
        initcap(TRIM(MARKET)) AS market
      FROM all_info
      WHERE ${where}
      ORDER BY name
    `;

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
