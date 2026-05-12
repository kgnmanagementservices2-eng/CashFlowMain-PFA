// src/routes/reconciliation.routes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");
const recController = require("../controllers/reconciliation.controller");

// Role Groupings
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
const READ_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

// 1. Get all closed books history
router.get(
  "/",
  authenticateToken,
  authorizeRoles(...READ_ROLES),
  recController.getReconciliations,
);

// 2. Fetch opening balance for the current month
// Placed above parameterized routes to prevent route overlap issues
router.get(
  "/opening-balance",
  authenticateToken,
  authorizeRoles(...READ_ROLES),
  recController.getOpeningBalance,
);

// 3. Close Book (Admins Only)
router.post(
  "/close",
  authenticateToken,
  authorizeRoles(...ADMIN_ROLES),
  recController.closeBook,
);

// 4. Reopen Book (Admins Only)
router.delete(
  "/reopen/:id",
  authenticateToken,
  authorizeRoles(...ADMIN_ROLES),
  recController.reopenBook,
);

module.exports = router;
