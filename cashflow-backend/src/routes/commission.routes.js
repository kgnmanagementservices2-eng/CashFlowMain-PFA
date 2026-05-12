const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");
const commissionController = require("../controllers/commission.controller");
const checkClosedBook = require("../middleware/checkClosedBook"); // 🔥 IMPORTED MIDDLEWARE

// --- Role Groups ---
const READ_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

const WRITE_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.EXPENSE_COMMISSION_MANAGER,
];

const APPROVER_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.EXPENSE_COMMISSION_MANAGER,
];

// --- 1. GET ALL COMMISSIONS ---
// Handles Pagination, Search, Dates, and Grand Totals
router.get(
  "/",
  authenticateToken,
  authorizeRoles(...READ_ROLES),
  commissionController.getCommissions,
);
// dashboard.routes.js

// --- 2. CREATE COMMISSION ENTRY ---
router.post(
  "/",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...WRITE_ROLES),
  commissionController.createCommission,
);

// --- 3. UPDATE COMMISSION ENTRY (EDIT) ---
// 🔥 NEW: Added the PUT route for editing records
router.put(
  "/:id",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...WRITE_ROLES),
  commissionController.updateCommission,
);

// --- 4. APPROVE ---
router.post(
  "/:id/approve",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...APPROVER_ROLES),
  commissionController.approveCommission,
);

// --- 5. REJECT ---
router.post(
  "/:id/reject",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...APPROVER_ROLES),
  commissionController.rejectCommission,
);

// --- 6. AUDIT ---
router.post(
  "/:id/audit",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...APPROVER_ROLES),
  commissionController.auditCommission,
);

// --- 7. RAISE ISSUE (Reset to Pending) ---
router.post(
  "/:id/issue",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...APPROVER_ROLES, ROLES.MARKET_MANAGER),
  commissionController.raiseIssue,
);
router.post(
  "/:id/mark-paid",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...APPROVER_ROLES, ROLES.MARKET_MANAGER),
  commissionController.markCommissionPaid,
);

module.exports = router;
