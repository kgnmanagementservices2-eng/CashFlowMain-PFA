const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");
const expenseController = require("../controllers/expense.controller"); // Reusing same controller!
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

// We reuse the exact same get method because it handles all the aliases dynamically!
router.get(
  "/",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  expenseController.getExpenses,
);

router.post(
  "/:id/approve",
  authenticateToken,
  checkClosedBook,

  authorizeRoles(...APPROVER_ROLES),
  expenseController.approveExpense,
);
router.post(
  "/:id/reject",
  authenticateToken,
  checkClosedBook,

  authorizeRoles(...APPROVER_ROLES),
  expenseController.rejectExpense,
);
router.post(
  "/:id/audit",
  authenticateToken,
  checkClosedBook,
  authorizeRoles(...APPROVER_ROLES),
  expenseController.auditExpense,
);

module.exports = router;
