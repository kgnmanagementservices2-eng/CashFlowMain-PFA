// src/routes/cashflow.routes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");
const cashflowController = require("../controllers/cashflow.controller");

const GLOBAL_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

// Auditors purposefully left out of POST so they cannot write data
const WRITE_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
];

// --- GET CASHFLOW (TILL) ---
// Handles pagination, search, totals, and mutually exclusive date fetching
router.get(
  "/",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  cashflowController.getCashflow,
);

// --- POST CASHFLOW (TILL) ---
// Handles creating a new Till record with Market Guard isolation
router.post(
  "/",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  cashflowController.createCashflow,
);

module.exports = router;
