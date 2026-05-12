// // src/routes/payroll.routes.js
// const express = require("express");
// const router = express.Router();
// const { authenticateToken } = require("../middleware/auth");
// const { ROLES, authorizeRoles } = require("../middleware/rbac");
// const payrollController = require("../controllers/payroll.controller");

// // --- Role Groups ---
// const READ_ROLES = [
//   ROLES.ADMIN,
//   ROLES.SUPER_ADMIN,
//   ROLES.MARKET_MANAGER,
//   ROLES.EXPENSE_COMMISSION_MANAGER,
//   ROLES.PAYROLL_MANAGER,
// ];

// const WRITE_ROLES = [
//   ROLES.ADMIN,
//   ROLES.SUPER_ADMIN,
//   ROLES.MARKET_MANAGER,
//   ROLES.PAYROLL_MANAGER,
// ];

// const APPROVER_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PAYROLL_MANAGER];

// // --- 1. GET ALL PAYROLL ---
// router.get(
//   "/",
//   authenticateToken,
//   authorizeRoles(...READ_ROLES),
//   payrollController.getPayroll,
// );

// // --- 2. CREATE PAYROLL ---
// router.post(
//   "/",
//   authenticateToken,
//   authorizeRoles(...WRITE_ROLES),
//   payrollController.createPayroll,
// );

// // --- 3. APPROVE PAYROLL ---
// router.post(
//   "/:id/approve",
//   authenticateToken,
//   authorizeRoles(...APPROVER_ROLES),
//   payrollController.approvePayroll,
// );

// // --- 4. REJECT PAYROLL ---
// router.post(
//   "/:id/reject",
//   authenticateToken,
//   authorizeRoles(...APPROVER_ROLES),
//   payrollController.rejectPayroll,
// );

// // --- 5. AUDIT PAYROLL ---
// router.post(
//   "/:id/audit",
//   authenticateToken,
//   authorizeRoles(...APPROVER_ROLES),
//   payrollController.auditPayroll,
// );

// // --- 6. RAISE ISSUE ---
// router.post(
//   "/:id/issue",
//   authenticateToken,
//   authorizeRoles(...APPROVER_ROLES),
//   payrollController.raiseIssue,
// );

// // --- 7. MARK AS PAID BY MM (🔥 THE NEW ROUTE) ---
// router.post(
//   "/:id/mark-paid",
//   authenticateToken,
//   authorizeRoles(...APPROVER_ROLES),
//   payrollController.markPayrollPaid,
// );
// // Add this inside src/routes/payroll.routes.js

// // --- 8. UPDATE PAYROLL ---
// router.put(
//   "/:id",
//   authenticateToken,
//   authorizeRoles(...WRITE_ROLES),
//   payrollController.updatePayrollExpense,
// );
// module.exports = router;
// src/routes/payroll.routes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");
const checkClosedBook = require("../middleware/checkClosedBook"); // 🔥 IMPORTED MIDDLEWARE
const payrollController = require("../controllers/payroll.controller");

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
  ROLES.MARKET_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

const APPROVER_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PAYROLL_MANAGER];

// --- 1. GET ALL PAYROLL ---
router.get(
  "/",
  authenticateToken,
  authorizeRoles(...READ_ROLES),
  payrollController.getPayroll,
);

// --- 2. CREATE PAYROLL ---
router.post(
  "/",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  checkClosedBook, // 🔥 Added Check
  payrollController.createPayroll,
);

// --- 3. APPROVE PAYROLL ---
router.post(
  "/:id/approve",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES),
  checkClosedBook, // 🔥 Added Check
  payrollController.approvePayroll,
);

// --- 4. REJECT PAYROLL ---
router.post(
  "/:id/reject",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES),
  checkClosedBook, // 🔥 Added Check
  payrollController.rejectPayroll,
);

// --- 5. AUDIT PAYROLL ---
router.post(
  "/:id/audit",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES),
  checkClosedBook, // 🔥 Added Check
  payrollController.auditPayroll,
);

// --- 6. RAISE ISSUE ---
router.post(
  "/:id/issue",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES, ROLES.MARKET_MANAGER),
  checkClosedBook, // 🔥 Added Check
  payrollController.raiseIssue,
);

// --- 7. MARK AS PAID BY MM ---
router.post(
  "/:id/mark-paid",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES, ROLES.MARKET_MANAGER),
  checkClosedBook, // 🔥 Added Check
  payrollController.markPayrollPaid,
);

// --- 8. UPDATE PAYROLL ---
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  checkClosedBook, // 🔥 Added Check
  payrollController.updatePayrollExpense,
);

module.exports = router;
