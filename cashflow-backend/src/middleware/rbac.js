// src/middleware/rbac.js

// Define your system roles as constants to avoid typos
const ROLES = {
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin", // (Added this just to be safe based on our earlier edits!)
  MARKET_MANAGER: "market_manager",
  EXPENSE_COMMISSION_MANAGER: "expense_commission_manager", // <--- CHANGE THIS LINE
  PAYROLL_MANAGER: "payroll_manager",
};

/**
 * Middleware to restrict access based on user roles.
 * @param {...string} allowedRoles - Pass the roles allowed to access the route
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user is set by the authenticateToken middleware
    if (!req.user || !req.user.role) {
      return res
        .status(403)
        .json({ error: "Access denied. User role not found." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden. You do not have permission to perform this action.",
      });
    }

    // If they have the right role, let them through
    next();
  };
};

module.exports = { ROLES, authorizeRoles };
