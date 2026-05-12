
// import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
// import { useGlobalState } from "../context/GlobalStateContext.jsx";
// import api from "../services/api.js";
// import { fmt, num } from "../utils/utils.js";
// import FinancialCards from "../components/FinancialCards.jsx"; 

// function getCurrentYearMonth() {
//   const d = new Date();
//   return { y: d.getFullYear(), m: d.getMonth() + 1 };
// }
// function daysInMonth(year, month) {
//   return new Date(year, month, 0).getDate();
// }
// function pad2(n) {
//   return String(n).padStart(2, "0");
// }
// const EmptyState = ({ color, title, subtitle }) => {
//   const colorMap = {
//     purple: "bg-purple-100 text-purple-500",
//     orange: "bg-orange-100 text-orange-500",
//     blue: "bg-blue-100 text-blue-500",
//   };

//   return (
//     <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
//       <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${colorMap[color]} shadow-inner`}>
//         <div className="w-6 h-6 rounded-full bg-current opacity-40"></div>
//       </div>

//       <p className="text-sm font-semibold text-slate-600">{title}</p>
//       <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
//     </div>
//   );
// };

// const GhostChart = ({ type = "bars" }) => {
//   return (
//     <div className="absolute inset-0 opacity-40 blur-[2px] pointer-events-none">
      
//       {/* Bars style */}
//       {type === "bars" && (
//         <div className="flex items-end justify-between h-full px-6">
//           {[40, 60, 30, 70, 50, 80, 45].map((h, i) => (
//             <div
//               key={i}
//               style={{ height: `${h}%` }}
//               className="w-4 bg-gradient-to-t from-purple-200 to-purple-100 rounded-md"
//             />
//           ))}
//         </div>
//       )}

//       {/* Line style */}
//       {type === "line" && (
//         <svg className="w-full h-full">
//           <polyline
//             fill="none"
//             stroke="#c7d2fe"
//             strokeWidth="3"
//             points="0,200 50,150 100,180 150,120 200,140 250,90 300,110"
//           />
//         </svg>
//       )}

//       {/* Pie style */}
//       {type === "pie" && (
//         <div className="flex items-center justify-center h-full">
//           <div className="w-32 h-32 rounded-full bg-gradient-to-r from-orange-100 to-orange-200"></div>
//         </div>
//       )}
//     </div>
//   );
// };
// export default function DashboardPage({ onNavigate }) {
//   const { selectedMarket, selectedStore } = useGlobalState();
//   const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

//   const [year, setYear] = useState(curY);
//   const [month, setMonth] = useState(curM);
//   const [loading, setLoading] = useState(false);

//   const [fStore, setFStore] = useState("");
//   const [availableStores, setAvailableStores] = useState([]);

//   const emptyStatus = {
//     pending: { count: 0, amount: 0 },
//     approved: { count: 0, amount: 0 },
//     rejected: { count: 0, amount: 0 },
//   };


//   const [dashboardData, setDashboardData] = useState({
//     statusCounts: { store: emptyStatus, payroll: emptyStatus, commission: emptyStatus },
//     financials: { cash: 0, cashInBank: 0, inHand: 0, storeExpenses: 0, payroll: 0, commission: 0, variance: 0 },
//     chartData: { dailyCash: [], dailyCard: [], payrollByDay: {}, expenseCategories: {} },
//   });
// const isEmptyArray = (arr) => !arr || arr.every(v => !v || v === 0);

// const isSplitEmpty =
//   isEmptyArray(dashboardData.chartData.dailyCash) &&
//   isEmptyArray(dashboardData.chartData.dailyCard);

// const isPayrollEmpty =
//   Object.values(dashboardData.chartData.payrollByDay || {}).length === 0;

// const isExpenseEmpty =
//   Object.keys(dashboardData.chartData.expenseCategories || {}).length === 0;


//   const chartRefs = { split: useRef(null), expenses: useRef(null), payroll: useRef(null) };
//   const chartInstances = useRef({});

//   useEffect(() => {
//     if (selectedMarket) {
//       api.getStores(selectedMarket)
//         .then((data) => {
//           const list = (data || []).map((s) => (typeof s === "object" ? s.code || s.name : s)).filter(Boolean).sort();
//           setAvailableStores(list);
//         })
//         .catch((err) => console.error("Failed to load stores", err));
//     } else {
//       setAvailableStores([]);
//     }
//   }, [selectedMarket]);

//   useEffect(() => {
//     setFStore(selectedStore || "");
//   }, [selectedStore]);

//   const { fromDate, toDate, labelsDaily } = useMemo(() => {
//     const d = daysInMonth(year, month);
//     const from = `${year}-${pad2(month)}-01`;
//     const to = `${year}-${pad2(month)}-${pad2(d)}`;
//     const labels = Array.from({ length: d }, (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`);
//     return { fromDate: from, toDate: to, labelsDaily: labels };
//   }, [year, month]);

//   const fetchData = useCallback(async () => {
//     const controller = new AbortController();
//     setLoading(true);

//     try {
//       const data = await api.getDashboard({
//         market: selectedMarket || undefined,
//         store: fStore || undefined,
//         date_from: fromDate,
//         date_to: toDate,
//       });

//       if (controller.signal.aborted) return;

// const totals = data.summary?.totals || {};
// const charts = data.charts || {};
// const approvals = data.approvals || {};
//       setDashboardData({
//         statusCounts: {
//           store: approvals.expenses || emptyStatus,
//           payroll: approvals.payroll || emptyStatus,
//           commission: approvals.commission || emptyStatus, 
//         },
//         financials: {
//           cash: num(totals.sales),
//           cashInBank: num(totals.bank),
//           inHand: num(totals.pickup),
//           storeExpenses: num(totals.expenses),
//           payroll: num(totals.payroll),
//           commission: num(totals.commission),
//           variance: num(totals.variance),
//         },
//         chartData: {
//           dailyCash: labelsDaily.map((d) => num(charts.dailyCash?.[d])),
//           dailyCard: labelsDaily.map((d) => num(charts.dailyCard?.[d])), 
//           payrollByDay: charts.payroll || {},
//           // Extract the new categories mapping
//           expenseCategories: charts.expenseCategories || {}
//         },
//       });
//     } catch (e) {
//       if (!controller.signal.aborted) console.error("❌ Dashboard API error:", e);
//     } finally {
//       if (!controller.signal.aborted) setLoading(false);
//     }
//     return () => controller.abort();
//   }, [selectedMarket, fStore, fromDate, toDate, labelsDaily]);

//   useEffect(() => { fetchData(); }, [fetchData]);

//   const ensureChartJs = useCallback(async () => {
//     if (typeof window.Chart !== "undefined") return;
//     return new Promise((resolve) => {
//       const script = document.createElement("script");
//       script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
//       script.async = true;
//       script.onload = resolve;
//       document.body.appendChild(script);
//     });
//   }, []);

//   const createChart = useCallback((key, ctx, config) => {
//     if (!ctx || !window.Chart) return;
//     if (chartInstances.current[key]) chartInstances.current[key].destroy();
//     chartInstances.current[key] = new window.Chart(ctx, config);
//   }, []);

// useEffect(() => {
//   if (loading) return;

//   // ❌ Prevent rendering empty charts
//   if (isSplitEmpty && isExpenseEmpty && isPayrollEmpty) return;

//   ensureChartJs().then(() => {
//     const { dailyCash, dailyCard, payrollByDay, expenseCategories } = dashboardData.chartData;

//     const colors = {
//       purple: "#7c3aed",
//       purpleLight: "#a78bfa",
//       orange: "#f97316",
//       orangeLight: "#fdba74",
//       darkBlue: "#312e81",
//       grid: "#f1f5f9",
//     };

//     const palette = [
//       colors.purple,
//       colors.orange,
//       colors.darkBlue,
//       colors.purpleLight,
//       colors.orangeLight,
//       "#10b981",
//       "#ef4444",
//       "#3b82f6",
//     ];

//     const globalOptions = {
//       responsive: true,
//       maintainAspectRatio: false,
//       animation: { duration: 1200 },
//       scales: {
//         x: { grid: { display: false }, border: { display: false } },
//         y: { grid: { color: colors.grid }, border: { display: false }, beginAtZero: true },
//       },
//     };

//     // ✅ Only render if NOT empty
//     if (!isSplitEmpty) {
//       createChart("split", chartRefs.split.current, {
//         type: "bar",
//         data: {
//           labels: labelsDaily,
//           datasets: [
//             { label: "Cash", data: dailyCash, backgroundColor: colors.purple, stack: "t", borderRadius: 6 },
//             { label: "Card", data: dailyCard, backgroundColor: colors.orangeLight, stack: "t", borderRadius: 6 }
//           ]
//         },
//         options: { ...globalOptions, scales: { x: { stacked: true }, y: { stacked: true } } }
//       });
//     }

//     if (!isExpenseEmpty) {
//       const expLabels = Object.keys(expenseCategories);
//       const expData = Object.values(expenseCategories);

//       createChart("expenses", chartRefs.expenses.current, {
//         type: "pie",
//         data: {
//           labels: expLabels,
//           datasets: [{
//             data: expData,
//             backgroundColor: palette.slice(0, expLabels.length),
//             borderWidth: 2,
//             borderColor: "#fff"
//           }]
//         },
//         options: { responsive: true, maintainAspectRatio: false }
//       });
//     }

//     if (!isPayrollEmpty) {
//       createChart("payroll", chartRefs.payroll.current, {
//         type: "line",
//         data: {
//           labels: labelsDaily,
//           datasets: [
//             {
//               label: "Payroll",
//               data: labelsDaily.map(d => (payrollByDay[d] || {}).Payroll || 0),
//               borderColor: colors.darkBlue,
//               tension: 0.4
//             },
//             {
//               label: "Commission",
//               data: labelsDaily.map(d => (payrollByDay[d] || {}).Commission || 0),
//               borderColor: colors.orange,
//               tension: 0.4
//             }
//           ]
//         },
//         options: globalOptions
//       });
//     }

//   });

//   return () => {
//     Object.values(chartInstances.current).forEach(c => c?.destroy());
//   };

// }, [dashboardData, loading]);

//   const { financials } = dashboardData;
//   const monthOptions = useMemo(() => [{ v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" }, { v: 4, label: "Apr" }, { v: 5, label: "May" }, { v: 6, label: "Jun" }, { v: 7, label: "Jul" }, { v: 8, label: "Aug" }, { v: 9, label: "Sep" }, { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" }], []);
//   const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => curY - 4 + i), [curY]);

//   return (
//     <section className="bg-slate-50 min-h-screen pl-4 pr-4 sm:p-6 lg:pl-6 pt-16 sm:pt-6 pb-4 sm:pb-6 space-y-8">
      
//       {/* Filters */}
//       <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 p-4 sm:p-5">
//         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
//           <div><label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Year</label><select className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-purple-500" value={year} onChange={(e) => setYear(Number(e.target.value))}>{yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
//           <div><label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Month</label><select className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-purple-500" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{monthOptions.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}</select></div>
//           <div><label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Market</label><input type="text" value={selectedMarket || "All"} className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-slate-50 text-slate-500" disabled /></div>
//           <div>
//             <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Store</label>
//             <select 
//               className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-purple-500"
//               value={fStore} 
//               onChange={(e) => setFStore(e.target.value)}
//             >
//               <option value="">All Stores</option>
//               {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
//             </select>
//           </div>
//         </div>
//       </div>

//       {loading && <div className="w-full text-center py-12 bg-white/50 rounded-2xl animate-pulse text-slate-500 font-medium">Fetching dashboard data...</div>}
      
//       {!loading && (
//         <div className="space-y-8">
          
//           <div>
//             <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">Financial Overview <span className="text-slate-400 font-medium text-lg">({monthOptions[month - 1].label} {year})</span></h2>
//             <FinancialCards 
//               sales={financials.cash} bank={financials.cashInBank} 
//               pickup={financials.inHand}
//               expenses={financials.storeExpenses + financials.payroll + financials.commission}
//               storeExpenses={financials.storeExpenses} payroll={financials.payroll} commission={financials.commission}
//               loading={loading}
//             />
//           </div>

//           <div>
//             <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">Approvals Status</h2>
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//               {[{ label: "Store Expenses", key: "store", route: "expense-history" }, { label: "Payroll", key: "payroll", route: "payroll-history" }, { label: "Commission", key: "commission", route: "commission-history" }].map((item) => (
//                 <button key={item.key} onClick={() => typeof onNavigate === "function" && onNavigate(item.route)} className="text-left bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 border border-slate-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
//                   <div className="flex justify-between items-center mb-4">
//                     <span className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors text-lg">{item.label}</span>
//                     <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">View Details &rarr;</span>
//                   </div>
//                   <div className="flex justify-between text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
//                     <div className="flex flex-col items-start">
//                       <span className="text-[11px] uppercase font-bold text-slate-400 mb-1">Pending</span>
//                       <b className="text-amber-500 text-lg">{dashboardData.statusCounts[item.key].pending.count}</b>
//                       <span className="text-xs text-slate-500">${fmt(dashboardData.statusCounts[item.key].pending.amount)}</span>
//                     </div>
//                     <div className="flex flex-col items-start">
//                       <span className="text-[11px] uppercase font-bold text-slate-400 mb-1">Approved</span>
//                       <b className="text-emerald-500 text-lg">{dashboardData.statusCounts[item.key].approved.count}</b>
//                       <span className="text-xs text-slate-500">${fmt(dashboardData.statusCounts[item.key].approved.amount)}</span>
//                     </div>
//                     <div className="flex flex-col items-start">
//                       <span className="text-[11px] uppercase font-bold text-slate-400 mb-1">Rejected</span>
//                       <b className="text-rose-500 text-lg">{dashboardData.statusCounts[item.key].rejected.count}</b>
//                       <span className="text-xs text-slate-500">${fmt(dashboardData.statusCounts[item.key].rejected.amount)}</span>
//                     </div>
//                   </div>
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
// <div className="bg-white rounded-2xl border border-slate-100 p-6 relative overflow-hidden">
//   <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-white pointer-events-none" />

//   <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
//     <div className="w-2 h-2 rounded-full bg-purple-500"></div>
//     Cash & Card Sales
//   </h3>

// <div className="relative h-[300px]">

//   {isSplitEmpty && <GhostChart type="bars" />}

//   {isSplitEmpty ? (
//     <EmptyState
//       color="purple"
//       title="No sales data"
//       subtitle="Try another filter"
//     />
//   ) : (
//     <canvas ref={chartRefs.split}></canvas>
//   )}
// </div>
// </div>
            
// <div className="bg-white rounded-2xl border border-slate-100 p-6 relative overflow-hidden">
//   <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 to-white pointer-events-none" />

//   <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
//     <div className="w-2 h-2 rounded-full bg-orange-500"></div>
//     Store Operating Expenses
//   </h3>

// <div className="relative h-[300px] flex items-center justify-center">

//   {isExpenseEmpty && <GhostChart type="pie" />}

//   {isExpenseEmpty ? (
//     <EmptyState
//       color="orange"
//       title="No expenses"
//       subtitle="No data for this period"
//     />
//   ) : (
//     <canvas ref={chartRefs.expenses}></canvas>
//   )}
// </div>
// </div>

// <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:col-span-2 relative overflow-hidden">
//   <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-white pointer-events-none" />

//   <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
//     <div className="w-2 h-2 rounded-full bg-blue-800"></div>
//     Payroll & Commissions
//   </h3>

// <div className="relative h-[300px]">

//   {isPayrollEmpty && <GhostChart type="line" />}

//   {isPayrollEmpty ? (
//     <EmptyState
//       color="blue"
//       title="No payroll data"
//       subtitle="Will appear after processing"
//     />
//   ) : (
//     <canvas ref={chartRefs.payroll}></canvas>
//   )}
// </div>
// </div>
//           </div>
          
//         </div>
//       )}
//     </section>
//   );
// }
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
import { fmt, num } from "../utils/utils.js";
import FinancialCards from "../components/FinancialCards.jsx"; 

function getCurrentYearMonth() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
const EmptyState = ({ color, title, subtitle }) => {
  const colorMap = {
    purple: "bg-purple-100 text-purple-500",
    orange: "bg-orange-100 text-orange-500",
    blue: "bg-blue-100 text-blue-500",
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${colorMap[color]} shadow-inner`}>
        <div className="w-6 h-6 rounded-full bg-current opacity-40"></div>
      </div>

      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
};

const GhostChart = ({ type = "bars" }) => {
  return (
    <div className="absolute inset-0 opacity-40 blur-[2px] pointer-events-none">
      
      {/* Bars style */}
      {type === "bars" && (
        <div className="flex items-end justify-between h-full px-6">
          {[40, 60, 30, 70, 50, 80, 45].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="w-4 bg-gradient-to-t from-purple-200 to-purple-100 rounded-md"
            />
          ))}
        </div>
      )}

      {/* Line style */}
      {type === "line" && (
        <svg className="w-full h-full">
          <polyline
            fill="none"
            stroke="#c7d2fe"
            strokeWidth="3"
            points="0,200 50,150 100,180 150,120 200,140 250,90 300,110"
          />
        </svg>
      )}

      {/* Pie style */}
      {type === "pie" && (
        <div className="flex items-center justify-center h-full">
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-orange-100 to-orange-200"></div>
        </div>
      )}
    </div>
  );
};
export default function DashboardPage({ onNavigate }) {
  const { selectedMarket, selectedStore } = useGlobalState();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  const [loading, setLoading] = useState(false);

  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);

  const emptyStatus = {
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
  };

  const [dashboardData, setDashboardData] = useState({
    statusCounts: { store: emptyStatus, payroll: emptyStatus, commission: emptyStatus },
    financials: { cash: 0, cashInBank: 0, inHand: 0, storeExpenses: 0, payroll: 0, commission: 0, variance: 0, openingBalance: 0 }, // 🔥 ADDED openingBalance
    chartData: { dailyCash: [], dailyCard: [], payrollByDay: {}, expenseCategories: {} },
  });

  const isEmptyArray = (arr) => !arr || arr.every(v => !v || v === 0);

  const isSplitEmpty =
    isEmptyArray(dashboardData.chartData.dailyCash) &&
    isEmptyArray(dashboardData.chartData.dailyCard);

  const isPayrollEmpty =
    Object.values(dashboardData.chartData.payrollByDay || {}).length === 0;

  const isExpenseEmpty =
    Object.keys(dashboardData.chartData.expenseCategories || {}).length === 0;

  const chartRefs = { split: useRef(null), expenses: useRef(null), payroll: useRef(null) };
  const chartInstances = useRef({});

  useEffect(() => {
    if (selectedMarket) {
      api.getStores(selectedMarket)
        .then((data) => {
          const list = (data || []).map((s) => (typeof s === "object" ? s.code || s.name : s)).filter(Boolean).sort();
          setAvailableStores(list);
        })
        .catch((err) => console.error("Failed to load stores", err));
    } else {
      setAvailableStores([]);
    }
  }, [selectedMarket]);

  useEffect(() => {
    setFStore(selectedStore || "");
  }, [selectedStore]);

  const { fromDate, toDate, labelsDaily } = useMemo(() => {
    const d = daysInMonth(year, month);
    const from = `${year}-${pad2(month)}-01`;
    const to = `${year}-${pad2(month)}-${pad2(d)}`;
    const labels = Array.from({ length: d }, (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`);
    return { fromDate: from, toDate: to, labelsDaily: labels };
  }, [year, month]);

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);

    try {
      const data = await api.getDashboard({
        market: selectedMarket || undefined,
        store: fStore || undefined,
        date_from: fromDate,
        date_to: toDate,
      });

      if (controller.signal.aborted) return;

      const totals = data.summary?.totals || {};
      const charts = data.charts || {};
      const approvals = data.approvals || {};

      setDashboardData({
        statusCounts: {
          store: approvals.expenses || emptyStatus,
          payroll: approvals.payroll || emptyStatus,
          commission: approvals.commission || emptyStatus, 
        },
        financials: {
          cash: num(totals.sales),
          cashInBank: num(totals.bank),
          inHand: num(totals.pickup),
          storeExpenses: num(totals.expenses),
          payroll: num(totals.payroll),
          commission: num(totals.commission),
          variance: num(totals.variance),
          openingBalance: num(totals.opening_balance), // 🔥 POPULATED FROM BACKEND
        },
        chartData: {
          dailyCash: labelsDaily.map((d) => num(charts.dailyCash?.[d])),
          dailyCard: labelsDaily.map((d) => num(charts.dailyCard?.[d])), 
          payrollByDay: charts.payroll || {},
          expenseCategories: charts.expenseCategories || {}
        },
      });
    } catch (e) {
      if (!controller.signal.aborted) console.error("❌ Dashboard API error:", e);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    return () => controller.abort();
  }, [selectedMarket, fStore, fromDate, toDate, labelsDaily]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ensureChartJs = useCallback(async () => {
    if (typeof window.Chart !== "undefined") return;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
      script.async = true;
      script.onload = resolve;
      document.body.appendChild(script);
    });
  }, []);

  const createChart = useCallback((key, ctx, config) => {
    if (!ctx || !window.Chart) return;
    if (chartInstances.current[key]) chartInstances.current[key].destroy();
    chartInstances.current[key] = new window.Chart(ctx, config);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (isSplitEmpty && isExpenseEmpty && isPayrollEmpty) return;

    ensureChartJs().then(() => {
      const { dailyCash, dailyCard, payrollByDay, expenseCategories } = dashboardData.chartData;

      const colors = {
        purple: "#7c3aed",
        purpleLight: "#a78bfa",
        orange: "#f97316",
        orangeLight: "#fdba74",
        darkBlue: "#312e81",
        grid: "#f1f5f9",
      };

      const palette = [
        colors.purple,
        colors.orange,
        colors.darkBlue,
        colors.purpleLight,
        colors.orangeLight,
        "#10b981",
        "#ef4444",
        "#3b82f6",
      ];

      const globalOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1200 },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { grid: { color: colors.grid }, border: { display: false }, beginAtZero: true },
        },
      };

      if (!isSplitEmpty) {
        createChart("split", chartRefs.split.current, {
          type: "bar",
          data: {
            labels: labelsDaily,
            datasets: [
              { label: "Cash", data: dailyCash, backgroundColor: colors.purple, stack: "t", borderRadius: 6 },
              { label: "Card", data: dailyCard, backgroundColor: colors.orangeLight, stack: "t", borderRadius: 6 }
            ]
          },
          options: { ...globalOptions, scales: { x: { stacked: true }, y: { stacked: true } } }
        });
      }

      if (!isExpenseEmpty) {
        const expLabels = Object.keys(expenseCategories);
        const expData = Object.values(expenseCategories);

        createChart("expenses", chartRefs.expenses.current, {
          type: "pie",
          data: {
            labels: expLabels,
            datasets: [{
              data: expData,
              backgroundColor: palette.slice(0, expLabels.length),
              borderWidth: 2,
              borderColor: "#fff"
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }

      if (!isPayrollEmpty) {
        createChart("payroll", chartRefs.payroll.current, {
          type: "line",
          data: {
            labels: labelsDaily,
            datasets: [
              {
                label: "Payroll",
                data: labelsDaily.map(d => (payrollByDay[d] || {}).Payroll || 0),
                borderColor: colors.darkBlue,
                tension: 0.4
              },
              {
                label: "Commission",
                data: labelsDaily.map(d => (payrollByDay[d] || {}).Commission || 0),
                borderColor: colors.orange,
                tension: 0.4
              }
            ]
          },
          options: globalOptions
        });
      }

    });

    return () => {
      Object.values(chartInstances.current).forEach(c => c?.destroy());
    };

  }, [dashboardData, loading]);

  const { financials } = dashboardData;
  const monthOptions = useMemo(() => [{ v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" }, { v: 4, label: "Apr" }, { v: 5, label: "May" }, { v: 6, label: "Jun" }, { v: 7, label: "Jul" }, { v: 8, label: "Aug" }, { v: 9, label: "Sep" }, { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" }], []);
  const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => curY - 4 + i), [curY]);

  return (
    <section className="bg-slate-50 min-h-screen pl-4 pr-4 sm:p-6 lg:pl-6 pt-16 sm:pt-6 pb-4 sm:pb-6 space-y-8">
      
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
          <div><label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Year</label><select className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-purple-500" value={year} onChange={(e) => setYear(Number(e.target.value))}>{yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
          <div><label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Month</label><select className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-purple-500" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{monthOptions.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}</select></div>
          <div><label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Market</label><input type="text" value={selectedMarket || "All"} className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-slate-50 text-slate-500" disabled /></div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Store</label>
            <select 
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-purple-500"
              value={fStore} 
              onChange={(e) => setFStore(e.target.value)}
            >
              <option value="">All Stores</option>
              {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="w-full text-center py-12 bg-white/50 rounded-2xl animate-pulse text-slate-500 font-medium">Fetching dashboard data...</div>}
      
      {!loading && (
        <div className="space-y-8">
          
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">Financial Overview <span className="text-slate-400 font-medium text-lg">({monthOptions[month - 1].label} {year})</span></h2>
<FinancialCards 
              sales={financials.cash} 
              bank={financials.cashInBank} 
              pickup={financials.inHand}
              expenses={financials.storeExpenses + financials.payroll + financials.commission}
              storeExpenses={financials.storeExpenses} 
              payroll={financials.payroll} 
              commission={financials.commission}
              openingBalance={financials.openingBalance} // 🔥 PASSED TO FINANCIAL CARDS
              loading={loading}
              onNavigate={onNavigate} // 🔥 PASSED DOWN SO CARDS ARE CLICKABLE
            />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">Approvals Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[{ label: "Store Expenses", key: "store", route: "expense-history" }, { label: "Payroll", key: "payroll", route: "payroll-history" }, { label: "Commission", key: "commission", route: "commission-history" }].map((item) => (
                <button key={item.key} onClick={() => typeof onNavigate === "function" && onNavigate(item.route)} className="text-left bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 border border-slate-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors text-lg">{item.label}</span>
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">View Details &rarr;</span>
                  </div>
                  <div className="flex justify-between text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex flex-col items-start">
                      <span className="text-[11px] uppercase font-bold text-slate-400 mb-1">Pending</span>
                      <b className="text-amber-500 text-lg">{dashboardData.statusCounts[item.key].pending.count}</b>
                      <span className="text-xs text-slate-500">${fmt(dashboardData.statusCounts[item.key].pending.amount)}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[11px] uppercase font-bold text-slate-400 mb-1">Approved</span>
                      <b className="text-emerald-500 text-lg">{dashboardData.statusCounts[item.key].approved.count}</b>
                      <span className="text-xs text-slate-500">${fmt(dashboardData.statusCounts[item.key].approved.amount)}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[11px] uppercase font-bold text-slate-400 mb-1">Rejected</span>
                      <b className="text-rose-500 text-lg">{dashboardData.statusCounts[item.key].rejected.count}</b>
                      <span className="text-xs text-slate-500">${fmt(dashboardData.statusCounts[item.key].rejected.amount)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-white pointer-events-none" />

              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                Cash & Card Sales
              </h3>

              <div className="relative h-[300px]">

                {isSplitEmpty && <GhostChart type="bars" />}

                {isSplitEmpty ? (
                  <EmptyState
                    color="purple"
                    title="No sales data"
                    subtitle="Try another filter"
                  />
                ) : (
                  <canvas ref={chartRefs.split}></canvas>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-100 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 to-white pointer-events-none" />

              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                Store Operating Expenses
              </h3>

              <div className="relative h-[300px] flex items-center justify-center">

                {isExpenseEmpty && <GhostChart type="pie" />}

                {isExpenseEmpty ? (
                  <EmptyState
                    color="orange"
                    title="No expenses"
                    subtitle="No data for this period"
                  />
                ) : (
                  <canvas ref={chartRefs.expenses}></canvas>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:col-span-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-white pointer-events-none" />

              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-800"></div>
                Payroll & Commissions
              </h3>

              <div className="relative h-[300px]">

                {isPayrollEmpty && <GhostChart type="line" />}

                {isPayrollEmpty ? (
                  <EmptyState
                    color="blue"
                    title="No Payroll & Commissions data"
                    subtitle="Will appear after processing"
                  />
                ) : (
                  <canvas ref={chartRefs.payroll}></canvas>
                )}
              </div>
            </div>
          </div>
          
        </div>
      )}
    </section>
  );
}