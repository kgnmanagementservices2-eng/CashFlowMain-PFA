import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast"; 
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
import { toISO, fmt2, num, downloadCSV } from "../utils/utils.js";
import TruncatedTooltip from "../components/TruncatedTooltip.jsx";
import SpecificDayFilter from "../components/SpecificDayFilter.jsx";

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

export default function ExpenseHistoryPage() {
  const { selectedMarket, selectedStore } = useGlobalState();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  // 🚀 1. Server-Side Pagination & Totals State
  const [rows, setRows] = useState([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [grandTotal, setGrandTotal] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);
  
  // --- Filter State ---
  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);
  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  
  // Defaults
  const [statusFilter, setStatusFilter] = useState("all");
  const [auditFilter, setAuditFilter] = useState("all");

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);

  // Auto-clear selected dates when the Month or Year changes
  useEffect(() => {
    setSelectedSpecificDates([]);
  }, [month, year]);

  const fMarket = selectedMarket;

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

  // Sync Global Store Selection
  useEffect(() => {
    setFStore(selectedStore || "");
  }, [selectedStore]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [fMarket, fStore, statusFilter, auditFilter, year, month, searchTerm, selectedSpecificDates]);

  // --- Date Calculation ---
  const { fromDate, toDate } = useMemo(() => {
    const lastDay = daysInMonth(year, month);
    const from = `${year}-${pad2(month)}-01`;
    const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
    return { fromDate: from, toDate: to };
  }, [year, month]);

  // 🚀 2. SERVER-SIDE FETCHING WITH MUTUALLY EXCLUSIVE DATES
  const fetchFiltered = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiStatus = statusFilter === "all" ? undefined : statusFilter;
      const apiAudit = auditFilter === "all" ? undefined : auditFilter;

      // 🔥 Guarantee Mutually Exclusive Date Parameters
      let queryDate = undefined;
      let queryDateFrom = fromDate;
      let queryDateTo = toDate;
      let querySpecificDates = undefined;

      if (selectedSpecificDates.length === 1) {
        queryDate = selectedSpecificDates[0];
        queryDateFrom = undefined;
        queryDateTo = undefined;
      } else if (selectedSpecificDates.length > 1) {
        querySpecificDates = selectedSpecificDates.join(",");
        queryDateFrom = undefined;
        queryDateTo = undefined;
      }

      const response = await api.getExpenseApprovals({
        market: fMarket || undefined,
        store: fStore || undefined,
        status: apiStatus,
        audit_status: apiAudit,
        date: queryDate,
        date_from: queryDateFrom,
        date_to: queryDateTo,
        specific_dates: querySpecificDates,
        search: searchTerm || undefined,
        page: currentPage,
        limit: ROWS_PER_PAGE
      });

      const dataRows = response.data || [];
      setRows(dataRows);
      setTotalPages(response.pagination?.totalPages || 1);
      setGrandTotal(response.summary?.totalAmount || 0); 
      
      // 🚀 SET THE ALL-TIME AVAILABLE DATES FOR THE FILTER
      // Only update the available dates list if no specific day is currently selected!
      if (selectedSpecificDates.length === 0) {
        setAvailableDatesInMonth(response.summary?.availableDates || []);
      }

    } catch (err) {
      console.error("Failed to load expense history", err);
      toast.error("Failed to load expense history.");
    } finally {
      setIsLoading(false);
    }
  }, [fMarket, fStore, statusFilter, auditFilter, fromDate, toDate, searchTerm, currentPage, selectedSpecificDates]);

  useEffect(() => {
    fetchFiltered();
  }, [fetchFiltered]);

  // --- Export Logic ---
  const handleExport = () => {
    const header = [
      "Date", "Market", "Store", "Manager Name", "Category", 
      "Amount", "Receipt URL", "Comment", "Status", "Reason",
      "Audit Status", "Audit By"
    ];
    const lines = [header.join(",")];
    
    rows.forEach((r) => {
      const managerVal = r.managername ?? r.manager_name ?? r.managerName ?? r.ManagerName ?? "";
      const manager = managerVal.replaceAll(",", " ");

      const vals = [
        toISO(r.date || r.expense_date || ""),
        (r.market ?? "").replaceAll(",", " "),
        (r.store ?? "").replaceAll(",", " "),
        manager,
        (r.category ?? "").replaceAll(",", " "),
        String(r.amount ?? r.amount_numeric ?? "").replaceAll(",", ""),
        r.upload_url ?? "",
        (r.comment ?? r.notes ?? "").replaceAll("\n", " ").replaceAll(",", " "),
        r.status ?? "pending",
        (r.reason ?? "").replaceAll("\n", " ").replaceAll(",", " "),
        r.audit_status ?? "pending",
        r.audit_by ?? ""
      ];
      lines.push(vals.join(","));
    });
    
    downloadCSV(`expense-history-page-${currentPage}-${fMarket || "all"}.csv`, lines.join("\n"));
  };

  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => curY - 4 + i), [curY]);
  const monthOptions = [
    { v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" }, { v: 4, label: "Apr" },
    { v: 5, label: "May" }, { v: 6, label: "Jun" }, { v: 7, label: "Jul" }, { v: 8, label: "Aug" },
    { v: 9, label: "Sep" }, { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" },
  ];

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto relative">
      
      {/* --- Filter Controls with Search --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        
        {/* SEARCH BAR ROW */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
          <div className="relative w-full sm:max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search by Manager, Store, or Comments..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button onClick={handleExport} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap">
            Export Page CSV
          </button>
        </div>

        {/* Existing Grid Filters */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Market</label>
            <input type="text" value={fMarket || "All"} className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500" disabled />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Store</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" value={fStore} onChange={(e) => setFStore(e.target.value)}>
              <option value="">All Stores</option>
              {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Year</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Month</label>
              <SpecificDayFilter 
                availableDates={availableDatesInMonth}
                selectedDates={selectedSpecificDates}
                onChange={setSelectedSpecificDates}
              />
            </div>
            
            <select 
              className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {monthOptions.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Audit Status</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="audited">Audited</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- Data Table --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize">Expense History</h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              {rows.length} records shown
            </span>
          </div>
          
          {/* 🔥 Server-Side Calculated Grand Total Tag */}
          <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full shadow-sm">
            Filtered Grand Total: ${fmt2(grandTotal)}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</th>
                <th className="px-3 py-3">Market/Store</th>
                <th className="px-3 py-3">Manager Name</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3 text-center">Receipt</th>
                <th className="px-3 py-3 w-48 border-l-2 border-slate-200">Comment</th>
                <th className="px-3 py-3 w-40">Status / Reason</th>
                <th className="px-3 py-3 text-center">Audit Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500 font-medium">
                    Loading records...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500 font-medium">
                    No data found
                  </td>
                </tr>
              ) : (
                rows.map((r, index) => {
                  const url = r.upload_url || "";
                  const amtNum = num(r.amount ?? r.amount_numeric ?? 0);
                  const isAudited = r.audit_status === 'audited';
                  
                  let statusClass = "bg-amber-100 text-amber-700";
                  if (r.status === "approved") statusClass = "bg-emerald-100 text-emerald-700";
                  if (r.status === "rejected") statusClass = "bg-rose-100 text-rose-700";

                  let auditClass = "bg-slate-100 text-slate-500";
                  if (isAudited) auditClass = "bg-blue-100 text-blue-700";

                  return (
                    <tr key={r.id || index} className="hover:bg-blue-50 transition-colors group h-12">
                      <td className="px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium text-slate-700">
                        {toISO(r.date || r.expense_date)}
                      </td>
                      
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">{r.store ?? "-"}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.market ?? "-"}</div>
                      </td>
                      
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {r.managername ?? r.manager_name ?? r.managerName ?? r.ManagerName ?? "-"}
                      </td>
                      
                      <td className="px-3 py-2 capitalize font-medium text-slate-600">
                        {r.category || "-"}
                      </td>
                      
                      <td className={`px-3 py-2 text-right font-extrabold ${amtNum < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        ${fmt2(amtNum)}
                      </td>
                      
                      <td className="px-3 py-2 text-center">
                        {url ? (
                          <a className="text-blue-600 hover:text-blue-800 underline font-medium" href={url} target="_blank" rel="noopener noreferrer">View</a>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No File</span>
                        )}
                      </td>
                      
                      <td className="px-3 py-2 border-l-2 border-slate-100">
                        <TruncatedTooltip text={r.comment || r.notes} maxWidth="max-w-[180px]" placeholder="-" />
                      </td>
                      
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                            {r.status || "pending"}
                          </span>
                          <TruncatedTooltip text={r.reason} maxWidth="max-w-[140px]" placeholder="No reason" />
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${auditClass}`}>
                            {isAudited ? `Audited: ${r.audit_by?.split(' ')[0]}` : "Audit Pend"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Footer */}
            <tfoot>
              <tr className="bg-indigo-50/30 border-t border-indigo-100">
                <td className="px-3 py-3 text-right font-extrabold text-indigo-900 uppercase" colSpan="4">Grand Total:</td>
                <td className="px-3 py-3 text-right font-extrabold text-indigo-900 text-base">${fmt2(grandTotal)}</td>
                <td className="px-3 py-3 whitespace-nowrap" colSpan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs font-bold text-slate-500">
            Page {totalPages > 0 ? currentPage : 0} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button onClick={handlePrevPage} disabled={currentPage === 1} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors">Prev</button>
            <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors">Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}