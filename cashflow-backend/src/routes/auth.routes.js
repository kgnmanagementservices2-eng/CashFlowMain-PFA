const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { login } = require("../controllers/auth.controller");

// 1. Define the Rate Limiter rules
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  message: { error: "Too many login attempts, please try again later." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// 2. Apply the limiter middleware BEFORE the login controller
// POST /api/auth/login
router.post("/login", loginLimiter, login);

module.exports = router;
