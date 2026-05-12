const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const dashboardController = require("../controllers/dashboard.controller");
const { ROLES, authorizeRoles } = require("../middleware/rbac");

const WRITE_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];
router.get(
  "/combined",
  authenticateToken,
  dashboardController.getDashboardData,
);
router.get(
  "/pending-counts",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  dashboardController.getPendingCounts,
);
module.exports = router;
