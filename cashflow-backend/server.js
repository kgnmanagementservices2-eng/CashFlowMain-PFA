// server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Initialize DB connection (will log to console on success)
require("./src/config/db");

const app = express();
const PORT = process.env.PORT || 3000;

// --- 🛡️ AWS Production Configuration ---
// AWS Elastic Beanstalk runs behind a Load Balancer. We must trust the proxy
// to correctly identify the client's real IP address for rate limiting and logging.
app.set("trust proxy", 1);

// --- Core Security & Performance Middleware ---
app.use(helmet()); // Always use secure HTTP headers
app.use(compression()); // Compresses JSON payloads to save bandwidth

// Protect against basic DDoS / brute force attacks (1000 reqs per 15 min per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// --- STRICT CORS CONFIGURATION ---
// Set ALLOWED_ORIGINS in your AWS Elastic Beanstalk Environment properties.
// Example: ALLOWED_ORIGINS=https://main.d123456789.amplifyapp.com,http://localhost:5173
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173"]; // Fallback for local development

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, or local curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`Blocked by CORS: Origin ${origin} is not allowed.`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Required if you ever pass cookies or authorization headers
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Import Route Modules ---
const authRoutes = require("./src/routes/auth.routes");
const salesRoutes = require("./src/routes/sales.routes");
const varianceRoutes = require("./src/routes/variance.routes");
const cashflowRoutes = require("./src/routes/cashflow.routes");
const metaRoutes = require("./src/routes/meta.routes");
const expensesRoutes = require("./src/routes/expenses.routes");
const expenseApprovalsRoutes = require("./src/routes/expense-approvals.routes");
const payrollRoutes = require("./src/routes/payroll.routes");
const marketCashRoutes = require("./src/routes/market-cash.routes");
const notificationsRoutes = require("./src/routes/notifications.routes");
const uploadsRoutes = require("./src/routes/uploads.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");

// --- Mount Routers ---
app.use("/api/auth", authRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/variance", varianceRoutes);
app.use("/api/cashflow", cashflowRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/expense-approvals", expenseApprovalsRoutes);
app.use("/api/payroll-expenses", payrollRoutes);
app.use("/api/market-cash", marketCashRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/commission", require("./src/routes/commission.routes"));
app.use("/api/reconciliations", require("./src/routes/reconciliation.routes"));

// --- Health Check (Required for AWS Elastic Beanstalk Load Balancer) ---
app.get("/health", (_req, res) =>
  res.status(200).json({ ok: true, status: "Secure Backend Running" }),
);

// --- Global Error Handler (MUST BE LAST) ---
const errorHandler = require("./src/middleware/errorHandler");
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Production Server listening on port ${PORT}`);
});
