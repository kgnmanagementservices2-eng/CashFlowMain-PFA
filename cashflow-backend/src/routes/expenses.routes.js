const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");
const expenseController = require("../controllers/expense.controller");
const checkClosedBook = require("../middleware/checkClosedBook"); // 👈 Import middleware
const GLOBAL_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

router.get(
  "/",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  expenseController.getExpenses,
);
router.post(
  "/",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  checkClosedBook,
  expenseController.createExpense,
);

module.exports = router;
