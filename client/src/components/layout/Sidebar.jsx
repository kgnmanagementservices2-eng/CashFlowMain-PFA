
import React, { useState, useEffect } from "react";
import { useGlobalState } from "/src/context/GlobalStateContext.jsx";
import { useAuth } from "/src/context/AuthContext.jsx";
import { XIcon } from "/src/components/icons/Icons.jsx";
import api from "/src/services/api.js";
import logo from "../../assets/logo-dark.png";
import MonthlyReconciliations from "/src/components/MonthlyReconciliations.jsx"; // ✅ IMPORTED HERE

// Simple Chevron Icon
const ChevronDown = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// 1. Navigation Structure
const navStructure = [
  { name: "Dashboard", path: "dashboard" },
  { name: "Cash Tracker", path: "combined-sales-expenses" },
  { name: "Sales", path: "sales" },
  { name: "Variance", path: "variance" },
  { name: "Till Amount", path: "till" },
  // -- Store Expenses Group --
  {
    name: "Store Expenses",
    id: "group-store-expenses",
    isGroup: true,
    children: [
      { name: "Expense Entry", path: "store-expense" },
      { name: "Expense Approval", path: "expense-approval", adminOnly: true },
      { name: "Expense History", path: "expense-history" },
    ],
  },

  // -- Payroll Group --
  {
    name: "Payroll",
    id: "group-payroll",
    isGroup: true,
    children: [
      { name: "Payroll Expense", path: "payroll-expense", adminOnly: true },
      { name: "Payroll Approval", path: "payroll-approval", adminOnly: true },
      { name: "Payroll History", path: "payroll-history" },
    ],
  },

  // -- Commission Group --
  {
    name: "Commission",
    id: "group-commission",
    isGroup: true,
    children: [
      { name: "Commission Entry", path: "commission-entry", adminOnly: true },
      {
        name: "Commission Approval",
        path: "commission-approval",
        adminOnly: true,
      },
      { name: "Commission History", path: "commission-history" },
    ],
  },

  // -- Pick Up Group --
  {
    name: "Pick Up",
    id: "group-pickup",
    isGroup: true,
    children: [
      { name: "Pick Up Approval", path: "pickup-approval", adminOnly: true },
    ],
  },
];

// 2. Helper to flatten items for permission checking (removes duplicates)
const getFlatNavItems = (structure) => {
  const flat = [];
  const seenPaths = new Set();

  structure.forEach((item) => {
    if (item.isGroup) {
      item.children.forEach((child) => {
        if (!seenPaths.has(child.path)) {
          flat.push(child);
          seenPaths.add(child.path);
        }
      });
    } else {
      if (!seenPaths.has(item.path)) {
        flat.push(item);
        seenPaths.add(item.path);
      }
    }
  });
  return flat;
};

const allNavItems = getFlatNavItems(navStructure);
const normalize = (s) => (s ?? "").toString().trim().toLowerCase();

export default function Sidebar({ onNavigate, currentPage, onClose }) {
  const {
    markets,
    selectedMarket,
    selectedStore,
    setSelectedMarket,
    setSelectedStore,
    pendingApprovalsCount,
    pendingPayrollCount,
    pendingCommissionCount,
  } = useGlobalState();

  const { user } = useAuth();

  // -- Permission Logic --
  const isAdminBase =
    user && (user.role === "admin" || user.role === "super_admin");
  const isExpenseCommissionMgr =
    user?.role === "expense_commission_manager";
  const isPayrollMgr = user?.role === "payroll_manager";
  
  // 🛡️ CRITICAL FIX: Updated to match the PostgreSQL Enum "market_manager"
  const isLockedManager = user && user.role === "market_manager";

  let allowedPaths;
  if (isExpenseCommissionMgr) {
    allowedPaths = [
      "dashboard",
      "sales",
      "variance",
      "till",
      "store-expense",
      "expense-approval",
      "expense-history",
      "commission-entry", 
      "commission-approval",
      "commission-history",
      "combined-sales-expenses",
      "in-hand-cash",
      "pickup-approval"
    ];
  } else if (isPayrollMgr) {
    allowedPaths = [
      "dashboard",
      "payroll-expense",
      "payroll-approval",
      "payroll-history",
      "combined-sales-expenses",
      "in-hand-cash",
    ];
  } else if (isAdminBase) {
    allowedPaths = allNavItems.map((i) => i.path).concat("in-hand-cash");
  } else {
    // Standard Market Managers get non-admin routes
    allowedPaths = allNavItems
      .filter((i) => !i.adminOnly)
      .map((i) => i.path)
      .concat("in-hand-cash");
  }

  // -- Toggle State for Groups --
  const [expandedGroups, setExpandedGroups] = useState({});

  // Auto-expand group if current page is inside it
  useEffect(() => {
    navStructure.forEach((item) => {
      if (item.isGroup) {
        const hasActiveChild = item.children.some(
          (child) => child.path === currentPage
        );
        if (hasActiveChild) {
          setExpandedGroups((prev) => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [currentPage]);

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // -- Standard Market/Store State --
  const [stagedMarket, setStagedMarket] = useState(selectedMarket);
  const [stagedStore, setStagedStore] = useState(selectedStore);
  const [stagedStores, setStagedStores] = useState([]);

  useEffect(() => setStagedMarket(selectedMarket), [selectedMarket]);
  useEffect(() => setStagedStore(selectedStore), [selectedStore]);

  useEffect(() => {
    const fetchStagedStores = async () => {
      try {
        const marketToFetch = selectedMarket || "";
        const storeList = await api.getStores(marketToFetch);
        const storeNames = (storeList || [])
          .map((s) => {
            if (typeof s === "object" && s !== null) return s.code || "";
            return s;
          })
          .filter(Boolean)
          .sort();
        setStagedStores(storeNames);
      } catch (err) {
        console.error("Failed to fetch staged stores", err);
        setStagedStores([]);
      }
    };
    fetchStagedStores();
  }, [selectedMarket]);

  const handleMarketApply = () => {
    setSelectedMarket(stagedMarket);
    setSelectedStore(stagedStore);
  };

  const handleStoreApply = () => {
    setSelectedStore(stagedStore);
  };

  const handleNav = (path) => {
    onNavigate(path);
    if (onClose) onClose();
  };

  // -- Helper: Get Badge Count for a specific path --
  const getBadgeForPath = (path) => {
    if (path === "expense-approval") return pendingApprovalsCount;
    if (path === "payroll-approval") return pendingPayrollCount;
    if (path === "commission-approval") return pendingCommissionCount;
    // Note: Add pickup approval count here when available in GlobalState
    return 0;
  };

  // -- Helper: Render a single nav link --
  const renderNavLink = (item, isChild = false, parentId = "root") => {
    const isActive = currentPage === item.path;
    const badgeCount = getBadgeForPath(item.path);
    const badgeVisible = badgeCount > 0;

    const uniqueKey = `${parentId}-${item.path}`;

    return (
      <button
        key={uniqueKey}
        type="button"
        onClick={() => handleNav(item.path)}
        className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 
          ${isChild ? "pl-9 text-sm" : ""} 
          ${
            isActive
              ? "bg-slate-700 text-white shadow-sm"
              : "text-slate-200 hover:bg-slate-800 hover:text-white"
          }`}
      >
        <span className="truncate">{item.name}</span>
        {badgeVisible && (
          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[1.25rem] flex items-center justify-center">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      id="sidebar"
      className="w-64 h-screen bg-slate-900 text-slate-100 p-4 pb-6 flex flex-col shadow-xl border-r border-slate-800 overflow-y-auto no-scrollbar relative"
    >
      {/* Close button for mobile */}
      <button
        id="sidebar-close"
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 inline-flex items-center p-2 text-sm text-slate-400 rounded-lg lg:hidden hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
      >
        <span className="sr-only">Close sidebar</span>
        <XIcon className="w-5 h-5" />
      </button>

      {/* Brand */}
      <div className="mb-2 mt-2 ">
        <div className="flex items-start">
          <img
            src={logo}
            alt="CashFlow Pro"
            className="h-14 w-auto object-contain"
          />
        </div>
      </div>

      {/* Market Dropdown */}
      <div id="sidebar-markets" className="mb-3 space-y-1">
        <label className="block text-[11px] uppercase tracking-wide text-slate-400">
          Market
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2 mt-1">
          <select
            id="market-select"
            value={stagedMarket}
            onChange={(e) => setStagedMarket(normalize(e.target.value))}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={isLockedManager}
          >
            {isLockedManager ? (
              <option value={stagedMarket}>
                {stagedMarket?.toUpperCase() || "NO MARKET"}
              </option>
            ) : (
              <>
                <option value="">All Markets</option>
                {markets.map((m) => (
                  <option key={m} value={normalize(m)}>
                    {m}
                  </option>
                ))}
              </>
            )}
          </select>
          <button
            id="market-apply"
            onClick={handleMarketApply}
            className="text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg shrink-0 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={isLockedManager || stagedMarket === selectedMarket}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Store Dropdown */}
      <div id="sidebar-stores" className="mb-5 space-y-1">
        <label className="block text-[11px] uppercase tracking-wide text-slate-400">
          Store
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2 mt-1">
          <select
            id="store-select"
            value={stagedStore}
            onChange={(e) => setStagedStore(normalize(e.target.value))}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={stagedStores.length === 0}
          >
            <option value="">All Stores</option>
            {stagedStores.map((s) => (
              <option key={s} value={normalize(s)}>
                {s}
              </option>
            ))}
          </select>
          <button
            id="store-apply"
            onClick={handleStoreApply}
            className="text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg shrink-0 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={
              stagedStore === selectedStore || stagedStores.length === 0
            }
          >
            Apply
          </button>
        </div>
      </div>

      {/* ✅ ADDED MONTHLY RECONCILIATIONS BUTTON FOR ADMINS ONLY */}
      {isAdminBase && (
        <div className="mb-6 [&>button]:w-full">
          <MonthlyReconciliations />
        </div>
      )}

      {/* Navigation */}
      <nav className="space-y-0.5 text-sm flex-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">
          Menu
        </p>

        {navStructure.map((item) => {
          // 1. DROPDOWN GROUPS
          if (item.isGroup) {
            const visibleChildren = item.children.filter((child) =>
              allowedPaths.includes(child.path)
            );
            if (visibleChildren.length === 0) return null;

            const isExpanded = expandedGroups[item.id];

            const groupBadgeTotal = visibleChildren.reduce((acc, child) => {
              return acc + getBadgeForPath(child.path);
            }, 0);

            return (
              <div key={item.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(item.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 
                    ${
                      isExpanded
                        ? "text-slate-100 bg-slate-800/50"
                        : "text-slate-200 hover:bg-slate-800 hover:text-white"
                    }`}
                >
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    {groupBadgeTotal > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[1.25rem] flex items-center justify-center">
                        {groupBadgeTotal > 99 ? "99+" : groupBadgeTotal}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-1 space-y-0.5 animate-fadeIn">
                    {visibleChildren.map((child) =>
                      renderNavLink(child, true, item.id)
                    )}
                  </div>
                )}
              </div>
            );
          }

          // 2. STANDARD ITEMS
          if (allowedPaths.includes(item.path)) {
            return renderNavLink(item, false, "root");
          }

          return null;
        })}
      </nav>

      <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
        <p>© {new Date().getFullYear()} CashFlow Pro</p>
      </div>
    </aside>
  );
}