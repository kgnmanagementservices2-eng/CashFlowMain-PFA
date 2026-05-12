
// import React, { useState, useEffect } from "react";
// import { useAuth } from "./context/AuthContext.jsx";
// import { Toaster } from 'react-hot-toast';
// // Layout & Pages
// import MainLayout from "./components/layout/MainLayout.jsx";
// import LoginPage from "./pages/LoginPage.jsx";
// import NoInternetPage from "./pages/NoInternetPage.jsx"; // Offline page
// import DashboardPage from "./pages/DashboardPage.jsx";
// import SalesPage from "./pages/SalesPage.jsx";
// import VariancePage from "./pages/VariancePage.jsx";
// import TillPage from "./pages/TillPage.jsx";
// import InHandCashPage from "./pages/InHandCashPage.jsx";
// import StoreExpensePage from "./pages/StoreExpensePage.jsx";
// import ExpenseApprovalPage from "./pages/ExpenseApprovalPage.jsx";
// import PayrollExpensePage from "./pages/PayrollExpensePage.jsx";
// import PayrollHistoryPage from "./pages/PayrollHistoryPage.jsx";
// import CommissionHistoryPage from "./pages/CommissionHistoryPage.jsx";
// import ExpenseHistoryPage from "./pages/ExpenseHistoryPage.jsx";
// import PayrollApprovalPage from "./pages/PayrollApprovalPage.jsx";
// import CommissionApprovalPage from "./pages/CommissionApprovalPage.jsx";
// import CombinedSalesExpenses from "./pages/CombinedSalesExpenses.jsx";
// import PickUpApprovalPage from "./pages/PickUpApprovalPage.jsx";
// import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

// // 🛡️ CRITICAL FIX: Updated to match PostgreSQL Database ENUMs perfectly
// const ROLE = {
//   ADMIN: "admin",
//   SUPER_ADMIN: "super_admin",
//   MANAGER: "market_manager", 
//   EXP_COMM: "expense_commission_manager",
//   PAYROLL: "payroll_manager",
// };

// // Page definitions with allowed roles
// const pages = {
//   dashboard: {
//     title: "Dashboard",
//     subtitle: "",
//     component: DashboardPage,
//     roles: [
//       ROLE.ADMIN,
//       ROLE.SUPER_ADMIN,
//       ROLE.MANAGER,
//       ROLE.EXP_COMM,
//       ROLE.PAYROLL,
//     ],
//   },
//   sales: {
//     title: "Sales",
//     subtitle: "",
//     component: SalesPage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MANAGER, ROLE.EXP_COMM],
//   },
//   variance: {
//     title: "Variance",
//     subtitle: "",
//     component: VariancePage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MANAGER, ROLE.EXP_COMM],
//   },
//   till: {
//     title: "Till Amount",
//     subtitle: " ",
//     component: TillPage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MANAGER, ROLE.EXP_COMM],
//   },
//   "in-hand-cash": {
//     title: "In Hand Cash",
//     subtitle: "",
//     component: InHandCashPage,
//     roles: [
//       ROLE.ADMIN,
//       ROLE.SUPER_ADMIN,
//       ROLE.MANAGER,
//       ROLE.EXP_COMM,
//       ROLE.PAYROLL,
//     ],
//   },
//   "store-expense": {
//     title: "Store Expense",
//     subtitle: "",
//     component: StoreExpensePage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MANAGER, ROLE.EXP_COMM],
//   },
//   "expense-history": {
//     title: "Expense History",
//     subtitle: "",
//     component: ExpenseHistoryPage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MANAGER, ROLE.EXP_COMM],
//   },
//   "expense-approval": {
//     title: "Expense Approval",
//     subtitle: "",
//     component: ExpenseApprovalPage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.EXP_COMM],
//   },
//   "payroll-expense": {
//     title: "Payroll & Commission Expense",
//     subtitle: "",
//     component: PayrollExpensePage,
//     roles: [
//       ROLE.ADMIN,
//       ROLE.SUPER_ADMIN,
//       ROLE.MANAGER,
//       ROLE.PAYROLL,
//       ROLE.EXP_COMM,
//     ],
//   },
//   "payroll-history": {
//     title: "Payroll History",
//     subtitle: "",
//     component: PayrollHistoryPage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.PAYROLL, ROLE.MANAGER],
//   },
//   "commission-history": {
//     title: "Commission History",
//     subtitle: "",
//     component: CommissionHistoryPage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.EXP_COMM, ROLE.MANAGER],
//   },
//   "payroll-approval": {
//     title: "Payroll Approval",
//     subtitle: "",
//     component: PayrollApprovalPage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.PAYROLL],
//   },
//   "commission-approval": {
//     title: "Commission Approval",
//     subtitle: "",
//     component: CommissionApprovalPage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.EXP_COMM],
//   },
//   "pickup-approval": {
//     title: "Pick Up Approval",
//     subtitle: "",
//     component: PickUpApprovalPage,
//     roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN,ROLE.EXP_COMM],
//   },
//   "combined-sales-expenses": {
//     title: "Cash Tracker",
//     subtitle: "",
//     component: CombinedSalesExpenses,
//     roles: [
//       ROLE.ADMIN,
//       ROLE.SUPER_ADMIN,
//       ROLE.MANAGER,
//       ROLE.EXP_COMM,
//       ROLE.PAYROLL,
//     ],
//   },
// };

// /**
//  * Main App component. Acts as a simple router with offline detection.
//  */
// export default function App() {
//   const [page, setPage] = useState("dashboard");
//   const [navParams, setNavParams] = useState(null);
  
//   // History stack to track navigation
//   const [history, setHistory] = useState(["dashboard"]);

//   const { isAuthenticated, loading, user } = useAuth();
//   const [isOnline, setIsOnline] = useState(navigator.onLine);

//   useEffect(() => {
//     const handleOnline = () => setIsOnline(true);
//     const handleOffline = () => setIsOnline(false);

//     window.addEventListener("online", handleOnline);
//     window.addEventListener("offline", handleOffline);

//     return () => {
//       window.removeEventListener("online", handleOnline);
//       window.removeEventListener("offline", handleOffline);
//     };
//   }, []);

//   // onNavigate now pushes to history
//   const onNavigate = (path, params = null) => {
//     setPage(path);
//     setNavParams(params);

//     setHistory((prev) => {
//       // Don't add to history if we are clicking the same page we are already on
//       const currentLast = prev[prev.length - 1];
//       if (currentLast === path) return prev;
//       return [...prev, path];
//     });
//   };

//   // Handle Back functionality
//   const handleBack = () => {
//     if (history.length > 1) {
//       const newHistory = [...history];
//       newHistory.pop(); // Remove current page
//       const previousPage = newHistory[newHistory.length - 1]; // Get previous

//       setHistory(newHistory);
//       setPage(previousPage);
//       setNavParams(null); // Clear params when going back
//     }
//   };

//   if (!isOnline) {
//     return <NoInternetPage />;
//   }

//   if (loading) {
//     return (
//       <div className="bg-slate-50 min-h-screen w-full flex items-center justify-center">
//         Loading session...
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     return (
//       <>
//         <Toaster position="top-right" />
//         <LoginPage onNavigate={onNavigate} />
//       </>
//     );
//   }

//   const currentDef = pages[page] || pages.dashboard;
//   const CurrentPage = currentDef.component;
//   const pageTitle = currentDef.title || "Dashboard";
//   const pageSubtitle = currentDef.subtitle || "";

//   return (
//     <>
//       {/* 🚀 Render the Toaster so it's globally available inside the app */}
//       <Toaster position="top-right" />
//       <ProtectedRoute
//         roles={currentDef.roles}
//         onNavigate={onNavigate}
//         onBack={handleBack}
//         canGoBack={history.length > 1}
//         currentPage={page}
//         pageTitle={pageTitle}
//         pageSubtitle={pageSubtitle}
//       >
//         <CurrentPage onNavigate={onNavigate} navParams={navParams} />
//       </ProtectedRoute>
//     </>
//   );
// }
import React, { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import { Toaster } from 'react-hot-toast';
// Layout & Pages
import MainLayout from "./components/layout/MainLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NoInternetPage from "./pages/NoInternetPage.jsx"; // Offline page
import DashboardPage from "./pages/DashboardPage.jsx";
import SalesPage from "./pages/SalesPage.jsx";
import VariancePage from "./pages/VariancePage.jsx";
import TillPage from "./pages/TillPage.jsx";
import InHandCashPage from "./pages/InHandCashPage.jsx";
import StoreExpensePage from "./pages/StoreExpensePage.jsx";
import ExpenseApprovalPage from "./pages/ExpenseApprovalPage.jsx";
import PayrollExpensePage from "./pages/PayrollExpensePage.jsx";
import PayrollHistoryPage from "./pages/PayrollHistoryPage.jsx";
import CommissionEntryPage from "./pages/CommissionEntryPage.jsx"; // 🔥 NEW IMPORT
import CommissionHistoryPage from "./pages/CommissionHistoryPage.jsx";
import ExpenseHistoryPage from "./pages/ExpenseHistoryPage.jsx";
import PayrollApprovalPage from "./pages/PayrollApprovalPage.jsx";
import CommissionApprovalPage from "./pages/CommissionApprovalPage.jsx";
import CombinedSalesExpenses from "./pages/CombinedSalesExpenses.jsx";
import PickUpApprovalPage from "./pages/PickUpApprovalPage.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import FinancialCards from "./components/FinancialCards.jsx";
// 🛡️ CRITICAL FIX: Updated to match PostgreSQL Database ENUMs perfectly
const ROLE = {
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
  MANAGER: "market_manager", 
  EXP_COMM: "expense_commission_manager",
  PAYROLL: "payroll_manager",
};

// Page definitions with allowed roles
const pages = {
  dashboard: {
    title: "Dashboard",
    subtitle: "",
    component: DashboardPage,
    roles: [
      ROLE.ADMIN,
      ROLE.SUPER_ADMIN,
      ROLE.MANAGER,
      ROLE.EXP_COMM,
      ROLE.PAYROLL,
    ],
  },
  sales: {
    title: "Sales",
    subtitle: "",
    component: SalesPage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MANAGER, ROLE.EXP_COMM],
  },
  variance: {
    title: "Variance",
    subtitle: "",
    component: VariancePage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MANAGER, ROLE.EXP_COMM],
  },
  till: {
    title: "Till Amount",
    subtitle: " ",
    component: TillPage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MANAGER, ROLE.EXP_COMM],
  },
  "in-hand-cash": {
    title: "In Hand Cash",
    subtitle: "",
    component: InHandCashPage,
    roles: [
      ROLE.ADMIN,
      ROLE.SUPER_ADMIN,
      ROLE.MANAGER,
      ROLE.EXP_COMM,
      ROLE.PAYROLL,
    ],
  },
  "store-expense": {
    title: "Store Expense",
    subtitle: "",
    component: StoreExpensePage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MANAGER, ROLE.EXP_COMM],
  },
  "expense-history": {
    title: "Expense History",
    subtitle: "",
    component: ExpenseHistoryPage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MANAGER, ROLE.EXP_COMM],
  },
  "expense-approval": {
    title: "Expense Approval",
    subtitle: "",
    component: ExpenseApprovalPage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.EXP_COMM],
  },
  "payroll-expense": {
    title: "Payroll & Commission Expense",
    subtitle: "",
    component: PayrollExpensePage,
    roles: [
      ROLE.ADMIN,
      ROLE.SUPER_ADMIN,
      ROLE.PAYROLL,
      ROLE.EXP_COMM,
    ],
  },
  "payroll-history": {
    title: "Payroll History",
    subtitle: "",
    component: PayrollHistoryPage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.PAYROLL, ROLE.MANAGER],
  },
  // 🔥 NEW PAGE ADDED TO ROUTER
  "commission-entry": {
    title: "Commission Entry",
    subtitle: "",
    component: CommissionEntryPage,
    roles: [
      ROLE.ADMIN, 
      ROLE.SUPER_ADMIN, 
      ROLE.EXP_COMM
    ],
  },
  "commission-history": {
    title: "Commission History",
    subtitle: "",
    component: CommissionHistoryPage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.EXP_COMM, ROLE.MANAGER],
  },
  "payroll-approval": {
    title: "Payroll Approval",
    subtitle: "",
    component: PayrollApprovalPage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.PAYROLL],
  },
  "commission-approval": {
    title: "Commission Approval",
    subtitle: "",
    component: CommissionApprovalPage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.EXP_COMM],
  },
  "pickup-approval": {
    title: "Pick Up Approval",
    subtitle: "",
    component: PickUpApprovalPage,
    roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN,ROLE.EXP_COMM],
  },
  "combined-sales-expenses": {
    title: "Cash Tracker",
    subtitle: "",
    component: CombinedSalesExpenses,
    roles: [
      ROLE.ADMIN,
      ROLE.SUPER_ADMIN,
      ROLE.MANAGER,
      ROLE.EXP_COMM,
      ROLE.PAYROLL,
    ],
  },
};

/**
 * Main App component. Acts as a simple router with offline detection.
 */
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [navParams, setNavParams] = useState(null);
  
  // History stack to track navigation
  const [history, setHistory] = useState(["dashboard"]);

  const { isAuthenticated, loading, user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // onNavigate now pushes to history
  const onNavigate = (path, params = null) => {
    setPage(path);
    setNavParams(params);

    setHistory((prev) => {
      // Don't add to history if we are clicking the same page we are already on
      const currentLast = prev[prev.length - 1];
      if (currentLast === path) return prev;
      return [...prev, path];
    });
  };

  // Handle Back functionality
  const handleBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // Remove current page
      const previousPage = newHistory[newHistory.length - 1]; // Get previous

      setHistory(newHistory);
      setPage(previousPage);
      setNavParams(null); // Clear params when going back
    }
  };

  if (!isOnline) {
    return <NoInternetPage />;
  }

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen w-full flex items-center justify-center">
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginPage onNavigate={onNavigate} />
      </>
    );
  }

  const currentDef = pages[page] || pages.dashboard;
  const CurrentPage = currentDef.component;
  const pageTitle = currentDef.title || "Dashboard";
  const pageSubtitle = currentDef.subtitle || "";

  return (
    <>
      {/* 🚀 Render the Toaster so it's globally available inside the app */}
      <Toaster position="top-right" />
      <ProtectedRoute
        roles={currentDef.roles}
        onNavigate={onNavigate}
        onBack={handleBack}
        canGoBack={history.length > 1}
        currentPage={page}
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
      >
        <CurrentPage onNavigate={onNavigate} navParams={navParams} />
      </ProtectedRoute>
    </>
  );
}