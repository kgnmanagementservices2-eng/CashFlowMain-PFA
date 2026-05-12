// src/routes/market-cash.routes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");
const marketCashController = require("../controllers/market-cash.controller");
const checkClosedBook = require("../middleware/checkClosedBook"); // 👈 Import middleware

const GLOBAL_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

const APPROVER_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.EXPENSE_COMMISSION_MANAGER,
];

// Historical Balance (Running Carry Forward)
router.get(
  "/historical-balance",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  marketCashController.getHistoricalBalance,
);

// Get All Market Cash (Paginated & Searchable)
router.get(
  "/",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  marketCashController.getMarketCash,
);

// Create Market Cash
router.post(
  "/",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.MARKET_MANAGER,
    ROLES.EXPENSE_COMMISSION_MANAGER,
  ),
  marketCashController.createMarketCash,
);

// Approvals & Audits
router.post(
  "/:id/approve",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...APPROVER_ROLES),
  marketCashController.approveMarketCash,
);
router.post(
  "/:id/reject",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...APPROVER_ROLES),
  marketCashController.rejectMarketCash,
);
router.post(
  "/:id/audit",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...APPROVER_ROLES),
  marketCashController.auditMarketCash,
);

module.exports = router;
