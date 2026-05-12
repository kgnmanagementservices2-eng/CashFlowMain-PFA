// const BASE_URL = window.API_BASE_URL || `${window.location.origin}/api`;

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
// Reads token fresh per request
function authHeaders() {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function isValidDate(value) {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

const api = {
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${BASE_URL}/${endpoint.replace(/^\/+/, "")}`;

    let res;
    try {
      res = await fetch(url, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) },
      });
    } catch (err) {
      console.error("API network error:", err?.message || err);
      throw new Error(
        `[NETWORK] ${endpoint}: ${err?.message || "Network error"}`,
      );
    }

    let data = null;
    try {
      if (res.status === 204) return { success: true };
      data = await res.json();
    } catch {
      // ignore
    }

    // --- 🛡️ THE FIX: Bulletproof Auto-Logout ---
    // 1. Safely force the error message into a readable string
    let errorMsg = res.statusText || "";
    if (data) {
      if (typeof data === "string") errorMsg = data;
      else if (typeof data.message === "string") errorMsg = data.message;
      else if (typeof data.error === "string") errorMsg = data.error;
      else errorMsg = JSON.stringify(data);
    }

    const safeError = errorMsg.toLowerCase();
    const isLoginRoute = endpoint.includes("/login");

    // 2. Aggressive capture of 401s, 403s, or token errors (BUT IGNORE LOGIN)
    if (
      !isLoginRoute &&
      (res.status === 401 ||
        res.status === 403 ||
        safeError.includes("jwt expired") ||
        safeError.includes("token expired") ||
        safeError.includes("invalid token"))
    ) {
      console.warn("Session expired. Auto-logging out...");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
      throw new Error("Session expired. Redirecting to login...");
    }

    // 3. Normal Error Throw
    if (!res.ok) {
      throw new Error(errorMsg || "Request failed");
    }

    return data;
  },

  withQuery(basePath, params = {}) {
    const u = new URL(`http://dummy.com/${basePath}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        const s = String(v).trim();
        if (s !== "") u.searchParams.set(k, s);
      }
    });
    return u.pathname.replace(/^\/+/, "") + u.search;
  },

  // --- Auth ---
  login(email, password) {
    return this.request("auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me() {
    return this.request("auth/me");
  },

  // --- Markets & Stores (Metadata) ---
  getMarkets() {
    return this.request("meta/markets");
  },

  getStores(market) {
    const q = market ? `?market=${encodeURIComponent(market)}` : "";
    return this.request(`meta/stores${q}`);
  },

  // Update this in src/services/api.js
  getAdminSalesAll(payload = {}) {
    const params = new URLSearchParams();

    if (payload.market) params.set("market", payload.market);
    if (payload.store) params.set("store", payload.store);

    // Mutually Exclusive Date Logic
    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);

    // Search & Pagination
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    // CRITICAL: Return raw request
    return this.request(`sales/all?${params.toString()}`);
  },

  getAdminSalesByDate(date, market, store) {
    const params = new URLSearchParams();
    if (isValidDate(date)) params.set("date", date);
    if (market) params.set("market", market);
    if (store) params.set("store", store);
    return this.request(`sales/by-date?${params.toString()}`);
  },

  // --- Variance ---
  // Update this inside src/services/api.js
  getVarianceAll(payload = {}) {
    const params = new URLSearchParams();

    if (payload.market) params.set("market", payload.market);
    if (payload.store) params.set("store", payload.store);
    if (payload.status) params.set("status", payload.status);

    // Mutually Exclusive Date Logic
    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);

    // Search & Pagination
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    // CRITICAL: Return raw request
    return this.request(`variance/all?${params.toString()}`);
  },

  getVarianceByDate(date, market, store) {
    const params = new URLSearchParams();
    if (isValidDate(date)) params.set("date", date);
    if (market) params.set("market", market);
    if (store) params.set("store", store);
    return this.request(`variance/by-date?${params.toString()}`);
  },

  // --- Expenses ---
  getExpensesAll(market, store, fromDate, toDate) {
    const params = new URLSearchParams();
    if (market) params.set("market", market);
    if (store) params.set("store", store);
    if (fromDate) params.set("date_from", fromDate);
    if (toDate) params.set("date_to", toDate);
    return this.request(`expenses?${params.toString()}`);
  },

  getExpensesByDateWithMarket({ date, market, store, page, limit, search }) {
    const params = new URLSearchParams();
    if (isValidDate(date)) params.set("date", date);
    if (market) params.set("market", market);
    if (store) params.set("store", store);
    if (page) params.set("page", page);
    if (limit) params.set("limit", limit);
    if (search) params.set("search", search);
    // Returns full object { data, summary, pagination }
    return this.request(`expenses?${params.toString()}`);
  },

  createExpense(payload) {
    let { amount } = payload || {};
    const normalizedAmount =
      typeof amount === "string"
        ? amount.trim() || null
        : amount == null
          ? null
          : String(amount).trim() || null;

    return this.request("expenses", {
      method: "POST",
      body: JSON.stringify({ ...payload, amount: normalizedAmount }),
    });
  },

  async uploadExpenseFile(formData) {
    const headers = {};
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/uploads/receipt`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errData = await res
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(errData.message || errData.error || "Upload failed");
    }
    return res.json();
  },

  getExpenseApprovals({
    date,
    market,
    status,
    store,
    audit_status,
    date_from,
    date_to,
    search,
    page,
    limit,
    specific_dates,
  } = {}) {
    const params = new URLSearchParams();
    if (isValidDate(date)) params.set("date", date);
    if (market) params.set("market", market);
    if (status) params.set("status", status);
    if (store) params.set("store", store);
    if (audit_status) params.set("audit_status", audit_status);
    if (date_from) params.set("date_from", date_from);
    if (date_to) params.set("date_to", date_to);
    if (search) params.set("search", search);
    if (page) params.set("page", page);
    if (limit) params.set("limit", limit);

    // 🔥 YOU MUST ADD THIS LINE SO THE API ACTUALLY SENDS THE DATES!
    if (specific_dates) params.set("specific_dates", specific_dates);

    return this.request(`expense-approvals?${params.toString()}`);
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  approveExpense(id, reason = "", date, market) {
    return this.request(`expense-approvals/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market }),
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  rejectExpense(id, reason = "", date, market) {
    return this.request(`expense-approvals/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market }),
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  auditExpense(id, date, market) {
    return this.request(`expense-approvals/${id}/audit`, {
      method: "POST",
      body: JSON.stringify({ date, market }),
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  resetAuditExpense(id, date, market) {
    return this.request(`expense-approvals/${id}/audit-reset`, {
      method: "POST",
      body: JSON.stringify({ date, market }),
    });
  },

  // Update this inside src/services/api.js
  listTill(payload = {}) {
    const params = new URLSearchParams();

    if (payload.market) params.set("market", payload.market);
    if (payload.store) params.set("store", payload.store);

    // 🔥 Mutually Exclusive Date Logic
    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);

    // 🔥 Search & Pagination
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    // ⚠️ CRITICAL: Return raw request so component can read .data, .summary, and .pagination
    return this.request(`cashflow?${params.toString()}`);
  },

  createTill(payload) {
    return this.request("cashflow", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // --- Payroll Expenses ---
  getPayrollExpenses(payload = {}) {
    const params = new URLSearchParams();

    // Standard filters
    if (payload.market) params.set("market", payload.market);
    if (payload.store) params.set("store", payload.store);
    if (payload.category) params.set("category", payload.category);
    if (payload.status) params.set("status", payload.status);
    if (payload.audit_status) params.set("audit_status", payload.audit_status);
    if (payload.payment_status)
      params.set("payment_status", payload.payment_status); // 🔥 ADDED: Payment Status
    if (payload.date_period) params.set("date_period", payload.date_period);

    // 🔥 NEW: Mutually Exclusive Date Logic
    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);

    // 🔥 NEW: Search & Pagination
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    // ⚠️ CRITICAL: Return the raw request so the frontend can access .data, .summary, and .pagination
    return this.request(`payroll-expenses?${params.toString()}`);
  },

  createPayrollExpense(payload) {
    return this.request("payroll-expenses", {
      method: "POST",
      body: JSON.stringify(payload), // payload already contains date and market from the form
    });
  },

  updatePayrollExpense(id, payload) {
    return this.request(`payroll-expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload), // payload already contains date and market from the form
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  approvePayrollExpense(id, reason = "", date, market) {
    return this.request(`payroll-expenses/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market }),
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  rejectPayrollExpense(id, reason = "", date, market) {
    return this.request(`payroll-expenses/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market }),
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  auditPayrollExpense(id, date, market) {
    return this.request(`payroll-expenses/${id}/audit`, {
      method: "POST",
      body: JSON.stringify({ date, market }),
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  resetAuditPayrollExpense(id, date, market) {
    return this.request(`payroll-expenses/${id}/audit-reset`, {
      method: "POST",
      body: JSON.stringify({ date, market }),
    });
  },

  // Payload here typically contains { notes: "..." }, ensure you pass { notes, date, market } from the UI
  issuePayrollExpense(id, payload) {
    return this.request(`payroll-expenses/${id}/issue`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getExpensesGroupedByUniqueId(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market) params.set("market", payload.market);
    if (payload.store) params.set("store", payload.store);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    return this.request(`expenses/grouped-by-unique?${params.toString()}`);
  },

  getPayrollGroupedByUniqueId(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market) params.set("market", payload.market);
    if (payload.store) params.set("store", payload.store);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.category) params.set("category", payload.category);
    return this.request(
      `payroll-expenses/grouped-by-unique?${params.toString()}`,
    );
  },

  // --- In Hand Cash (Market Wallet) ---
  // Update this inside src/services/api.js
  listMarketCash(payload = {}) {
    const params = new URLSearchParams();

    if (payload.market) params.set("market", payload.market);
    if (payload.store) params.set("store", payload.store);
    if (payload.status && payload.status !== "all")
      params.set("status", payload.status);

    // 🔥 Mutually Exclusive Date Logic
    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);

    // 🔥 Search & Pagination
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    // ⚠️ CRITICAL: Return raw request so the component can read .data, .summary, and .pagination
    return this.request(`market-cash?${params.toString()}`);
  },

  createMarketCash(payload) {
    return this.request("market-cash", {
      method: "POST",
      body: JSON.stringify(payload), // payload already contains date and market from the form
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  approveMarketCash(id, reason = "", date, market) {
    return this.request(`market-cash/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market }),
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  rejectMarketCash(id, reason = "", date, market) {
    return this.request(`market-cash/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market }),
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  auditMarketCash(id, date, market) {
    return this.request(`market-cash/${id}/audit`, {
      method: "POST",
      body: JSON.stringify({ date, market }), // Needs to be sent as JSON body now
    });
  },

  // --- Notifications ---
  getNotifications(market) {
    const params = new URLSearchParams();
    if (market) {
      const normalizedMarket = String(market).toLowerCase().trim();
      params.set("market", normalizedMarket);
    }
    return this.request(`notifications?${params.toString()}`);
  },

  dismissNotification(id) {
    return this.request(`notifications/${id}/dismiss`, { method: "POST" });
  },

  clearAllNotifications(market) {
    return this.request("notifications/clear-all", {
      method: "POST",
      body: JSON.stringify({ market }),
    });
  },

  // --- Dashboard ---
  getDashboard(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market) params.set("market", payload.market);
    if (payload.store) params.set("store", payload.store);

    // Mutually Exclusive Dates
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);

    // Pagination & Search
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    // ⚠️ CRITICAL: Return the raw response object
    return this.request(`dashboard/combined?${params.toString()}`);
  },
  // ==========================================
  // 💰 COMMISSION API METHODS
  // ==========================================

  // --- Commissions ---
  getCommissions(payload = {}) {
    const params = new URLSearchParams();

    // Standard Filters
    if (payload.market) params.set("market", payload.market);
    if (payload.store) params.set("store", payload.store);
    if (payload.status && payload.status !== "all")
      params.set("status", payload.status);
    if (payload.audit_status && payload.audit_status !== "all")
      params.set("audit_status", payload.audit_status);
    if (payload.payment_status)
      params.set("payment_status", payload.payment_status);

    // Mutually Exclusive Date Logic
    if (payload.date) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);

    // Search & Pagination
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    // CRITICAL: Return raw request to capture { data, summary, pagination }
    return this.request(`commission?${params.toString()}`);
  },

  createCommission(payload) {
    return this.request("commission", {
      method: "POST",
      body: JSON.stringify(payload), // payload already contains date and market
    });
  },

  // 🔥 FIXED: Changed `commissions` to `commission` to match the others
  updateCommission(id, payload) {
    return this.request(`commission/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload), // payload already contains date and market
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  approveCommission(id, reason = "", date, market) {
    return this.request(`commission/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market }),
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  rejectCommission(id, reason = "", date, market) {
    return this.request(`commission/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market }),
    });
  },

  // 🔥 UPDATED: Added date and market to support Month-End Lock
  auditCommission(id, date, market) {
    return this.request(`commission/${id}/audit`, {
      method: "POST",
      body: JSON.stringify({ date, market }),
    });
  },

  // 🔥 NEW: Added this to connect to the "raiseIssue" backend controller!
  // Expects payload to be { notes: "...", date: "...", market: "..." }
  issueCommission(id, payload) {
    return this.request(`commission/${id}/issue`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Payload expects { add_amount_by_mm, reason_for_add_amount, date, market }
  markPayrollPaid(id, payload) {
    return this.request(`payroll-expenses/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  // Payload expects { add_amount_by_mm, reason_for_add_amount, date, market }
  markCommissionPaid(id, payload) {
    return this.request(`commission/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },
  getPendingCounts(payload = {}) {
    const params = new URLSearchParams();

    if (payload.market) params.set("market", payload.market);

    return this.request(`dashboard/pending-counts?${params.toString()}`);
  },
  // Add this inside src/services/api.js

  // ==========================================
  // MONTHLY RECONCILIATIONS (CLOSED BOOKS)
  // ==========================================

  getReconciliations(market) {
    const params = market ? `?market=${encodeURIComponent(market)}` : "";
    return this.request(`reconciliations${params}`);
  },

  getOpeningBalance(market, year, month) {
    const params = new URLSearchParams({ market, year, month }).toString();
    return this.request(`reconciliations/opening-balance?${params}`);
  },

  closeBook(data) {
    return this.request("reconciliations/close", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  reopenBook(id) {
    return this.request(`reconciliations/reopen/${id}`, {
      method: "DELETE",
    });
  },
};

export default api;
