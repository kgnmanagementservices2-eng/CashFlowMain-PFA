// src/routes/variance.routes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");
const varianceController = require("../controllers/variance.controller");

const GLOBAL_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

// Unified route that handles all filters, pagination, and searching
router.get(
  "/all",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  varianceController.getVariance,
);

module.exports = router;
