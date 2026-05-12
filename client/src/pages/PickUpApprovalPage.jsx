// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { useGlobalState } from "../context/GlobalStateContext.jsx";
// import api from "../services/api.js";
// import { toISO, fmt, downloadCSV } from "../utils/utils.js";
// import ApprovalTable from "../components/ApprovalTable.jsx";
// import SpecificDayFilter from "../components/SpecificDayFilter.jsx";
// import TruncatedTooltip from "../components/TruncatedTooltip.jsx";

// const ROWS_PER_PAGE = 20;

// // Helpers
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

// export default function PickUpApprovalPage({ navParams }) {
//   const { selectedMarket, selectedStore, refreshPendingBadge } = useGlobalState();
//   const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

//   // --- Pagination State ---
//   const [paginatedRows, setPaginatedRows] = useState([]);
//   const [allFilteredRows, setAllFilteredRows] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);

//   // --- Filter State ---
//   const [fStore, setFStore] = useState("");
//   const [availableStores, setAvailableStores] = useState([]);
//   const [year, setYear] = useState(curY);
//   const [month, setMonth] = useState(curM);
  
//   // Defaults: Status -> All, Audit -> Pending
//   const [statusFilter, setStatusFilter] = useState("all"); 
//   const [auditFilter, setAuditFilter] = useState("pending");

//   // Search & Specific Day State
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);

//   const [isLoading, setIsLoading] = useState(false);

//   // 🔥 NEW: Action Modal State (Replaces reasonCache)
//   const [actionModal, setActionModal] = useState({ isOpen: false, type: null, id: null, reason: "" });

//   // Auto-clear selected dates when the Month or Year changes
//   useEffect(() => {
//     setSelectedSpecificDates([]);
//   }, [month, year]);

//   // --- 1. Load Stores for Dropdown ---
//   useEffect(() => {
//     if (selectedMarket) {
//       api.getStores(selectedMarket)
//         .then((data) => {
//           const list = (data || [])
//             .map((s) => (typeof s === "object" ? s.code || s.name : s))
//             .filter(Boolean)
//             .sort();
//           setAvailableStores(list);
//         })
//         .catch((err) => console.error("Failed to load stores", err));
//     } else {
//       setAvailableStores([]);
//     }
//   }, [selectedMarket]);

//   // Sync Sidebar Store
//   useEffect(() => {
//     setFStore(selectedStore || "");
//   }, [selectedStore]);

//   // Handle Deep Linking
//   useEffect(() => {
//     if (navParams?.focus === "pending") {
//       setStatusFilter("pending");
//       setAuditFilter("pending");
//     }
//   }, [navParams]);

//   // --- Date Calculation ---
//   const { fromDate, toDate } = useMemo(() => {
//     const lastDay = daysInMonth(year, month);
//     const from = `${year}-${pad2(month)}-01`;
//     const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
//     return { fromDate: from, toDate: to };
//   }, [year, month]);

//   // --- Main Fetch Function ---
//   const fetchFiltered = useCallback(async () => {
//     setIsLoading(true);

//     try {
//       const data = await api.listMarketCash({
//         market: selectedMarket || undefined,
//         store: fStore || undefined,
//         status: statusFilter !== "all" ? statusFilter : undefined,
//         date_from: fromDate,
//         date_to: toDate,
//         limit: 500,
//         offset: 0,
//       });

// let rows = [];

// if (Array.isArray(data)) {
//   rows = data;
// } else if (Array.isArray(data?.data)) {
//   rows = data.data;
// } else if (Array.isArray(data?.rows)) {
//   rows = data.rows;
// } else {
//   console.error("❌ Unexpected API response:", data);
//   rows = [];
// }
//       // Frontend audit filter (UI driven)
//       if (auditFilter !== "all") {
//         rows = rows.filter((r) => {
//           const rAudit = (r.audit_status || "pending").toLowerCase();
//           if (auditFilter === "pending") return !r.audit_status || r.audit_status === "pending";
//           return rAudit === auditFilter;
//         });
//       }

//       // Sorting (latest first)
//       rows.sort((a, b) => new Date(b.date) - new Date(a.date));

//       setAllFilteredRows(rows);
//       setCurrentPage(1);

//     } catch (err) {
//       console.error("❌ Failed to load pickup approvals", err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [selectedMarket, fStore, statusFilter, auditFilter, fromDate, toDate]);

//   // Trigger Fetch
//   useEffect(() => {
//     let ignore = false;
//     const load = async () => { if (!ignore) await fetchFiltered(); };
//     load();
//     return () => { ignore = true; };
//   }, [fetchFiltered]);

//   // Search & Day Filters
//   const availableDatesInMonth = useMemo(() => {
//     return [...new Set(allFilteredRows.map(r => r.date ? r.date.split('T')[0] : null).filter(Boolean))].sort();
//   }, [allFilteredRows]);

//   const searchedRows = useMemo(() => {
//     let result = allFilteredRows;

//     // 1. Text Search Bar Filter
//     if (searchTerm) {
//       const lower = searchTerm.toLowerCase();
//       result = result.filter(r => 
//         (r.store || "").toLowerCase().includes(lower) ||
//         (r.market || "").toLowerCase().includes(lower) ||
//         (r.reason || "").toLowerCase().includes(lower)
//       );
//     }

//     // 2. Specific Days Filter
//     if (selectedSpecificDates.length > 0) {
//       result = result.filter(r => {
//         const rowDate = r.date ? r.date.split('T')[0] : null;
//         return selectedSpecificDates.includes(rowDate);
//       });
//     }

//     return result;
//   }, [allFilteredRows, searchTerm, selectedSpecificDates]);

//   // --- Pagination Logic ---
//   const totalPages = useMemo(() => Math.max(1, Math.ceil(searchedRows.length / ROWS_PER_PAGE)), [searchedRows]); 
  
//   useEffect(() => {
//     const start = (currentPage - 1) * ROWS_PER_PAGE;
//     const end = start + ROWS_PER_PAGE;
//     setPaginatedRows(searchedRows.slice(start, end));
//   }, [currentPage, searchedRows]);

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [selectedMarket, fStore, statusFilter, auditFilter, year, month]);

//   // 🔥 NEW: Modal Action Handlers (Replaces inline inputs)
//   const triggerAction = (id, type) => {
//     const row = allFilteredRows.find(r => r.id === id);
//     setActionModal({ isOpen: true, type, id, reason: row?.reason || "" });
//   };

//   const confirmAction = async () => {
//     const { id, type, reason } = actionModal;
//     const trimmedReason = reason.trim();

//     if (!trimmedReason && type === "reject") return alert(`You must provide a reason to reject this pick up record.`);

//     try {
//       if (type === "approve") await api.approveMarketCash(id, trimmedReason);
//       else if (type === "reject") await api.rejectMarketCash(id, trimmedReason);

//       await api.auditMarketCash(id);
      
//       setActionModal({ isOpen: false, type: null, id: null, reason: "" });
//       fetchFiltered();
//       if (refreshPendingBadge) refreshPendingBadge(selectedMarket);
//     } catch (err) {
//       alert("Action failed: " + (err.message || "Unknown error"));
//     }
//   };

//   const handleExport = () => {
//     const header = ["Date", "Market", "Store", "Amount", "Status", "Reason", "Audit Status", "Audit By"];
//     const lines = [header.join(",")];
//     searchedRows.forEach((r) => {
//       lines.push([
//         toISO(r.date),
//         (r.market ?? "").replaceAll(",", " "),
//         (r.store ?? "").replaceAll(",", ";"),
//         fmt(r.cash_entry),
//         r.status || "pending",
//         (r.reason || "").replaceAll(",", " "),
//         r.audit_status || "pending",
//         r.audit_by || "" 
//       ].join(","));
//     });
//     downloadCSV(`pickup-approvals-${selectedMarket || "all"}.csv`, lines.join("\n"));
//   };

//   const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => curY - 4 + i), [curY]);
//   const monthOptions = [
//     { v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" }, { v: 4, label: "Apr" },
//     { v: 5, label: "May" }, { v: 6, label: "Jun" }, { v: 7, label: "Jul" }, { v: 8, label: "Aug" },
//     { v: 9, label: "Sep" }, { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" },
//   ];

//   // --- TABLE CONFIGURATION --- 
//   const columns = [
//     { 
//       header: "Action", 
//       className: "w-[80px] min-w-[80px] max-w-[80px] sticky left-0 bg-slate-50 z-30 border-r",
//       render: (r) => (
//         <div className="flex flex-row items-center justify-center gap-1.5 w-full mx-auto">
//           {r.status !== 'approved' && (
//             <button 
//               onClick={() => triggerAction(r.id, "approve")} 
//               className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded shadow-sm transition-transform hover:scale-105"
//               title="Approve Record"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//               </svg>
//             </button>
//           )}
//           {r.status !== 'rejected' && (
//             <button 
//               onClick={() => triggerAction(r.id, "reject")} 
//               className="bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded shadow-sm transition-transform hover:scale-105"
//               title="Reject Record"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//               </svg>
//             </button>
//           )}
//         </div>
//       )
//     },
//     { 
//       header: "Market/Store", 
//       className: "w-[180px] min-w-[180px] max-w-[180px] sticky left-[80px] bg-slate-50 z-30 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
//       render: (r) => (
//         <div>
//           <div className="font-semibold text-slate-800 truncate">{r.store ?? "-"}</div>
//           <div className="text-[10px] text-slate-400 font-mono truncate">{r.market ?? "-"}</div>
//         </div>
//       )
//     },
//     { 
//       header: "Date", 
//       render: (r) => <span className="font-medium text-slate-700">{toISO(r.date)}</span>,
//       className: "whitespace-nowrap"
//     },
//     { 
//       header: "Amount", 
//       render: (r) => {
//         const amtNum = Number(r.cash_entry);
//         return <span className={`font-extrabold ${amtNum < 0 ? 'text-rose-600' : 'text-emerald-700'} tracking-tight`}>${fmt(amtNum)}</span>;
//       }, 
//       className: "text-right" 
//     },
//     { 
//       header: "Status / Reason", 
//       render: (r) => {
//         let color = "bg-amber-100 text-amber-700";
//         if (r.status === 'approved') color = "bg-emerald-100 text-emerald-700";
//         if (r.status === 'rejected') color = "bg-rose-100 text-rose-700";
        
//         return (
//           <div className="flex flex-col gap-1.5 items-start w-48">
//             <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color}`}>
//               {r.status || "pending"}
//             </span>
//             {/* 🔥 REPLACED INLINE INPUT WITH CLEAN TOOLTIP 🔥 */}
//             <TruncatedTooltip text={r.reason} maxWidth="max-w-[160px]" placeholder="No reason" />
//           </div>
//         );
//       }
//     },
//     { 
//       header: "Audit Status", 
//       render: (r) => {
//         const isAudited = r.audit_status === 'audited';
//         return (
//           <div className="flex flex-col items-center gap-1">
//              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isAudited ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
//                {isAudited ? `Audited: ${r.audit_by?.split(' ')[0]}` : "Audit Pend"}
//              </span>
//           </div>
//         );
//       },
//       className: "text-center"
//     }
//   ];

//   return (
//     <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto relative">
      
//       {/* 🔥 APPROVAL / REJECTION ACTION MODAL 🔥 */}
//       {actionModal.isOpen && (
//         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
//             <h3 className={`text-lg font-bold mb-2 capitalize ${actionModal.type === 'approve' ? 'text-emerald-700' : 'text-rose-700'}`}>
//               {actionModal.type} Record
//             </h3>
//             <p className="text-sm text-slate-500 mb-4">
//               Please provide a reason or note ({actionModal.type === 'reject' ? <span className="text-rose-600 font-semibold">Required</span> : "Optional"}).
//             </p>
//             <textarea
//               className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4 resize-none"
//               rows="3"
//               placeholder={`Enter reason to ${actionModal.type}...`}
//               value={actionModal.reason}
//               onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
//             />
//             <div className="flex justify-end gap-3">
//               <button onClick={() => setActionModal({ isOpen: false, type: null, id: null, reason: "" })} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">
//                 Cancel
//               </button>
//               <button 
//                 onClick={confirmAction}
//                 className={`px-4 py-2 text-white rounded-lg text-sm font-bold shadow-sm transition-colors ${
//                   actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
//                 }`}
//               >
//                 Confirm {actionModal.type}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Filters */}
//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        
//         {/* SEARCH BAR ROW */}
//         <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
//           <div className="relative w-full sm:max-w-md">
//             <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//             </svg>
//             <input 
//               type="text" 
//               placeholder="Search by Store, Market, or Reason..." 
//               value={searchTerm}
//               onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
//               className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
//             />
//           </div>
//           <button onClick={handleExport} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm">
//             Export CSV
//           </button>
//         </div>

//         {/* Existing Grid Filters */}
//         <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 items-end">
//           {/* Market & Store */}
//           <div>
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Market</label>
//             <input type="text" value={selectedMarket || "All"} className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500" disabled />
//           </div>
//           <div>
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Store</label>
//             <select 
//               className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
//               value={fStore} 
//               onChange={(e) => setFStore(e.target.value)}
//             >
//               <option value="">All Stores</option>
//               {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
//             </select>
//           </div>

//           {/* Date Filters */}
//           <div>
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Year</label>
//             <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={year} onChange={(e) => setYear(Number(e.target.value))}>
//               {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
//             </select>
//           </div>
          
//           {/* MONTH FILTER WITH SPECIFIC DAY SELECTOR */}
//           <div>
//             <div className="flex items-center justify-between mb-1">
//               <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Month</label>
//               <SpecificDayFilter 
//                 availableDates={availableDatesInMonth}
//                 selectedDates={selectedSpecificDates}
//                 onChange={setSelectedSpecificDates}
//               />
//             </div>
//             <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
//               {monthOptions.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
//             </select>
//           </div>

//           {/* Status Filters */}
//           <div>
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
//             <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
//               <option value="all">All</option>
//               <option value="pending">Pending</option>
//               <option value="approved">Approved</option>
//               <option value="rejected">Rejected</option>
//             </select>
//           </div>
//           <div>
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Audit Status</label>
//             <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)}>
//               <option value="pending">Pending</option>
//               <option value="audited">Audited</option>
//               <option value="all">All</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Reusable Table */}
//       <ApprovalTable 
//         title="Pick Up Approvals"
//         columns={columns}
//         rows={paginatedRows}
//         isLoading={isLoading}
//         pagination={{
//           currentPage,
//           totalPages,
//           onNext: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
//           onPrev: () => setCurrentPage(p => Math.max(p - 1, 1))
//         }}
//       />
//     </section>
//   );
// }
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
import { toISO, fmt, downloadCSV } from "../utils/utils.js";
import ApprovalTable from "../components/ApprovalTable.jsx";
import SpecificDayFilter from "../components/SpecificDayFilter.jsx";
import TruncatedTooltip from "../components/TruncatedTooltip.jsx";
import BookClosedPopup from "../components/BookClosedPopup.jsx"; // 🔥 IMPORTED POPUP

const ROWS_PER_PAGE = 20;

// Helpers
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

export default function PickUpApprovalPage({ navParams }) {
  const { selectedMarket, selectedStore, refreshPendingBadge } = useGlobalState();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  // --- Pagination State ---
  const [paginatedRows, setPaginatedRows] = useState([]);
  const [allFilteredRows, setAllFilteredRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Filter State ---
  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);
  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  
  // Defaults: Status -> All, Audit -> Pending
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [auditFilter, setAuditFilter] = useState("pending");

  // Search & Specific Day State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  // 🔥 ADDED STATE FOR BOOK CLOSED POPUP
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  // Action Modal State 
  const [actionModal, setActionModal] = useState({ isOpen: false, type: null, id: null, reason: "" });

  // Auto-clear selected dates when the Month or Year changes
  useEffect(() => {
    setSelectedSpecificDates([]);
  }, [month, year]);

  // --- 1. Load Stores for Dropdown ---
  useEffect(() => {
    if (selectedMarket) {
      api.getStores(selectedMarket)
        .then((data) => {
          const list = (data || [])
            .map((s) => (typeof s === "object" ? s.code || s.name : s))
            .filter(Boolean)
            .sort();
          setAvailableStores(list);
        })
        .catch((err) => console.error("Failed to load stores", err));
    } else {
      setAvailableStores([]);
    }
  }, [selectedMarket]);

  // Sync Sidebar Store
  useEffect(() => {
    setFStore(selectedStore || "");
  }, [selectedStore]);

  // Handle Deep Linking
  useEffect(() => {
    if (navParams?.focus === "pending") {
      setStatusFilter("pending");
      setAuditFilter("pending");
    }
  }, [navParams]);

  // --- Date Calculation ---
  const { fromDate, toDate } = useMemo(() => {
    const lastDay = daysInMonth(year, month);
    const from = `${year}-${pad2(month)}-01`;
    const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
    return { fromDate: from, toDate: to };
  }, [year, month]);

  // --- Main Fetch Function ---
  const fetchFiltered = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await api.listMarketCash({
        market: selectedMarket || undefined,
        store: fStore || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        date_from: fromDate,
        date_to: toDate,
        limit: 500,
        offset: 0,
      });

      let rows = [];

      if (Array.isArray(data)) {
        rows = data;
      } else if (Array.isArray(data?.data)) {
        rows = data.data;
      } else if (Array.isArray(data?.rows)) {
        rows = data.rows;
      } else {
        console.error("❌ Unexpected API response:", data);
        rows = [];
      }
      
      // Frontend audit filter (UI driven)
      if (auditFilter !== "all") {
        rows = rows.filter((r) => {
          const rAudit = (r.audit_status || "pending").toLowerCase();
          if (auditFilter === "pending") return !r.audit_status || r.audit_status === "pending";
          return rAudit === auditFilter;
        });
      }

      // Sorting (latest first)
      rows.sort((a, b) => new Date(b.date) - new Date(a.date));

      setAllFilteredRows(rows);
      setCurrentPage(1);

    } catch (err) {
      console.error("❌ Failed to load pickup approvals", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMarket, fStore, statusFilter, auditFilter, fromDate, toDate]);

  // Trigger Fetch
  useEffect(() => {
    let ignore = false;
    const load = async () => { if (!ignore) await fetchFiltered(); };
    load();
    return () => { ignore = true; };
  }, [fetchFiltered]);

  // Search & Day Filters
  const availableDatesInMonth = useMemo(() => {
    return [...new Set(allFilteredRows.map(r => r.date ? r.date.split('T')[0] : null).filter(Boolean))].sort();
  }, [allFilteredRows]);

  const searchedRows = useMemo(() => {
    let result = allFilteredRows;

    // 1. Text Search Bar Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r => 
        (r.store || "").toLowerCase().includes(lower) ||
        (r.market || "").toLowerCase().includes(lower) ||
        (r.reason || "").toLowerCase().includes(lower)
      );
    }

    // 2. Specific Days Filter
    if (selectedSpecificDates.length > 0) {
      result = result.filter(r => {
        const rowDate = r.date ? r.date.split('T')[0] : null;
        return selectedSpecificDates.includes(rowDate);
      });
    }

    return result;
  }, [allFilteredRows, searchTerm, selectedSpecificDates]);

  // --- Pagination Logic ---
  const totalPages = useMemo(() => Math.max(1, Math.ceil(searchedRows.length / ROWS_PER_PAGE)), [searchedRows]); 
  
  useEffect(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    setPaginatedRows(searchedRows.slice(start, end));
  }, [currentPage, searchedRows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMarket, fStore, statusFilter, auditFilter, year, month]);

  // --- Modal Action Handlers ---
  const triggerAction = (id, type) => {
    const row = allFilteredRows.find(r => r.id === id);
    setActionModal({ isOpen: true, type, id, reason: row?.reason || "" });
  };

  const confirmAction = async () => {
    const { id, type, reason } = actionModal;
    const trimmedReason = reason.trim();

    if (!trimmedReason && type === "reject") return alert(`You must provide a reason to reject this pick up record.`);

    // 🔥 Find row to pass date and market to backend for Closed Book check
    const row = allFilteredRows.find(r => r.id === id);

    try {
      if (type === "approve") {
        await api.approveMarketCash(id, trimmedReason, row.date, row.market);
      } else if (type === "reject") {
        await api.rejectMarketCash(id, trimmedReason, row.date, row.market);
      }

      await api.auditMarketCash(id, row.date, row.market);
      
      setActionModal({ isOpen: false, type: null, id: null, reason: "" });
      fetchFiltered();
      if (refreshPendingBadge) refreshPendingBadge(selectedMarket);
    } catch (err) {
      // 🔥 CATCH BOOK CLOSED ERROR
      if (err?.message === "Book closed for the month. Contact admin." || err?.error === "BOOK_CLOSED") {
        setActionModal({ isOpen: false, type: null, id: null, reason: "" });
        setShowClosedPopup(true);
      } else {
        alert("Action failed: " + (err.message || "Unknown error"));
      }
    }
  };

  const handleExport = () => {
    const header = ["Date", "Market", "Store", "Amount", "Status", "Reason", "Audit Status", "Audit By"];
    const lines = [header.join(",")];
    searchedRows.forEach((r) => {
      lines.push([
        toISO(r.date),
        (r.market ?? "").replaceAll(",", " "),
        (r.store ?? "").replaceAll(",", ";"),
        fmt(r.cash_entry),
        r.status || "pending",
        (r.reason || "").replaceAll(",", " "),
        r.audit_status || "pending",
        r.audit_by || "" 
      ].join(","));
    });
    downloadCSV(`pickup-approvals-${selectedMarket || "all"}.csv`, lines.join("\n"));
  };

  const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => curY - 4 + i), [curY]);
  const monthOptions = [
    { v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" }, { v: 4, label: "Apr" },
    { v: 5, label: "May" }, { v: 6, label: "Jun" }, { v: 7, label: "Jul" }, { v: 8, label: "Aug" },
    { v: 9, label: "Sep" }, { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" },
  ];

  // --- TABLE CONFIGURATION --- 
  const columns = [
    { 
      header: "Action", 
      className: "w-[80px] min-w-[80px] max-w-[80px] sticky left-0 bg-slate-50 z-30 border-r",
      render: (r) => (
        <div className="flex flex-row items-center justify-center gap-1.5 w-full mx-auto">
          {r.status !== 'approved' && (
            <button 
              onClick={() => triggerAction(r.id, "approve")} 
              className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded shadow-sm transition-transform hover:scale-105"
              title="Approve Record"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {r.status !== 'rejected' && (
            <button 
              onClick={() => triggerAction(r.id, "reject")} 
              className="bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded shadow-sm transition-transform hover:scale-105"
              title="Reject Record"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )
    },
    { 
      header: "Market/Store", 
      className: "w-[180px] min-w-[180px] max-w-[180px] sticky left-[80px] bg-slate-50 z-30 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
      render: (r) => (
        <div>
          <div className="font-semibold text-slate-800 truncate">{r.store ?? "-"}</div>
          <div className="text-[10px] text-slate-400 font-mono truncate">{r.market ?? "-"}</div>
        </div>
      )
    },
    { 
      header: "Date", 
      render: (r) => <span className="font-medium text-slate-700">{toISO(r.date)}</span>,
      className: "whitespace-nowrap"
    },
    { 
      header: "Amount", 
      render: (r) => {
        const amtNum = Number(r.cash_entry);
        return <span className={`font-extrabold ${amtNum < 0 ? 'text-rose-600' : 'text-emerald-700'} tracking-tight`}>${fmt(amtNum)}</span>;
      }, 
      className: "text-right" 
    },
    { 
      header: "Status / Reason", 
      render: (r) => {
        let color = "bg-amber-100 text-amber-700";
        if (r.status === 'approved') color = "bg-emerald-100 text-emerald-700";
        if (r.status === 'rejected') color = "bg-rose-100 text-rose-700";
        
        return (
          <div className="flex flex-col gap-1.5 items-start w-48">
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color}`}>
              {r.status || "pending"}
            </span>
            <TruncatedTooltip text={r.reason} maxWidth="max-w-[160px]" placeholder="No reason" />
          </div>
        );
      }
    },
    { 
      header: "Audit Status", 
      render: (r) => {
        const isAudited = r.audit_status === 'audited';
        return (
          <div className="flex flex-col items-center gap-1">
             <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isAudited ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
               {isAudited ? `Audited: ${r.audit_by?.split(' ')[0]}` : "Audit Pend"}
             </span>
          </div>
        );
      },
      className: "text-center"
    }
  ];

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto relative">
      
      {/* 🔥 APPROVAL / REJECTION ACTION MODAL 🔥 */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <h3 className={`text-lg font-bold mb-2 capitalize ${actionModal.type === 'approve' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {actionModal.type} Record
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Please provide a reason or note ({actionModal.type === 'reject' ? <span className="text-rose-600 font-semibold">Required</span> : "Optional"}).
            </p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4 resize-none"
              rows="3"
              placeholder={`Enter reason to ${actionModal.type}...`}
              value={actionModal.reason}
              onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setActionModal({ isOpen: false, type: null, id: null, reason: "" })} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">
                Cancel
              </button>
              <button 
                onClick={confirmAction}
                className={`px-4 py-2 text-white rounded-lg text-sm font-bold shadow-sm transition-colors ${
                  actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {actionModal.type}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        
        {/* SEARCH BAR ROW */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
          <div className="relative w-full sm:max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search by Store, Market, or Reason..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button onClick={handleExport} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm">
            Export CSV
          </button>
        </div>

        {/* Existing Grid Filters */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 items-end">
          {/* Market & Store */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Market</label>
            <input type="text" value={selectedMarket || "All"} className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500" disabled />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Store</label>
            <select 
              className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              value={fStore} 
              onChange={(e) => setFStore(e.target.value)}
            >
              <option value="">All Stores</option>
              {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Date Filters */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Year</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          
          {/* MONTH FILTER WITH SPECIFIC DAY SELECTOR */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Month</label>
              <SpecificDayFilter 
                availableDates={availableDatesInMonth}
                selectedDates={selectedSpecificDates}
                onChange={setSelectedSpecificDates}
              />
            </div>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {monthOptions.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </div>

          {/* Status Filters */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Audit Status</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="audited">Audited</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reusable Table */}
      <ApprovalTable 
        title="Pick Up Approvals"
        columns={columns}
        rows={paginatedRows}
        isLoading={isLoading}
        pagination={{
          currentPage,
          totalPages,
          onNext: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
          onPrev: () => setCurrentPage(p => Math.max(p - 1, 1))
        }}
      />

      {/* --- BOOK CLOSED POPUP --- */}
      <BookClosedPopup 
        isOpen={showClosedPopup} 
        onClose={() => setShowClosedPopup(false)} 
      />

    </section>
  );
}