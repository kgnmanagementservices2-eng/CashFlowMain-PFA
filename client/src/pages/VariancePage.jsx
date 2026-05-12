import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
import { fmt, num, toISO, downloadCSV } from "../utils/utils.js";
import SpecificDayFilter from "../components/SpecificDayFilter.jsx";

const ROWS_PER_PAGE = 20;

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

export default function VariancePage() {
  const { selectedMarket, selectedStore } = useGlobalState();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  // --- Filter State ---
  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all"); 
  
  // --- Server-Side Pagination State ---
  const [rows, setRows] = useState([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- Search & Date State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);

  // --- Totals State ---
  const [pageTotals, setPageTotals] = useState({ variance: 0, resolved: 0, pending: 0 });
  const [grandTotals, setGrandTotals] = useState({ variance: 0, resolved: 0, pending: 0 });

  // Auto-clear selected dates when Month/Year changes
  useEffect(() => {
    setSelectedSpecificDates([]);
  }, [month, year]);

  // Load Stores
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

  useEffect(() => { setFStore(selectedStore || ""); }, [selectedStore]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMarket, fStore, year, month, statusFilter, searchTerm, selectedSpecificDates]);

  const { fromDate, toDate } = useMemo(() => {
    const lastDay = daysInMonth(year, month);
    return { fromDate: `${year}-${pad2(month)}-01`, toDate: `${year}-${pad2(month)}-${pad2(lastDay)}` };
  }, [year, month]);

  // 🚀 SERVER-SIDE FETCHING
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let queryDateFrom = fromDate;
      let queryDateTo = toDate;
      let querySpecificDates = undefined;

      // Mutually Exclusive Dates
      if (selectedSpecificDates.length > 0) {
        querySpecificDates = selectedSpecificDates.join(",");
        queryDateFrom = undefined;
        queryDateTo = undefined;
      }

      const response = await api.getVarianceAll({
        market: selectedMarket || undefined,
        store: fStore || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
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
      setGrandTotals(response.summary?.totals || { variance: 0, resolved: 0, pending: 0 });

      if (selectedSpecificDates.length === 0) {
        setAvailableDatesInMonth(response.summary?.availableDates || []);
      }

      // Calculate strictly Page Totals for UI reference
      let ptVar = 0, ptRes = 0, ptPen = 0;
      dataRows.forEach(r => {
        ptVar += num(r.variance_amount ?? r.varianceamount);
        ptRes += num(r.resolved_amount ?? r.resolvedamount);
        ptPen += num(r.pending_amount ?? r.pendingamount);
      });
      setPageTotals({ variance: ptVar, resolved: ptRes, pending: ptPen });

    } catch (err) {
      console.error("Failed to load variance data", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMarket, fStore, statusFilter, fromDate, toDate, searchTerm, currentPage, selectedSpecificDates]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Handle Export ---
  const handleExport = () => {
    if (!rows || rows.length === 0) return alert("No data to export.");

    const headers = [
      "Date", "Market", "Store", "DM Name", "Variance", 
      "Resolved", "Pending", "Reason", "Status", "Approved By"
    ];
    const lines = [headers.join(",")];
    
    rows.forEach((r) => {
      lines.push([
        toISO(r.date),
        (r.market ?? "").replaceAll(",", " "),
        (r.store ?? "").replaceAll(",", " "),
        (r.dm_name ?? r.dmname ?? "").replaceAll(",", " "),
        num(r.variance_amount ?? r.varianceamount),
        num(r.resolved_amount ?? r.resolvedamount),
        num(r.pending_amount ?? r.pendingamount),
        (r.reason ?? "").replace(/,/g, " "),
        r.status ?? "",
        (r.approved_by ?? r.approvedby ?? "").replaceAll(",", " "),
      ].join(","));
    });

    downloadCSV(`variance_page_${currentPage}_${year}_${pad2(month)}.csv`, lines.join("\n"));
  };

  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => curY - 4 + i), [curY]);
  const monthOptions = [ { v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" }, { v: 4, label: "Apr" }, { v: 5, label: "May" }, { v: 6, label: "Jun" }, { v: 7, label: "Jul" }, { v: 8, label: "Aug" }, { v: 9, label: "Sep" }, { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" } ];

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto relative">
      
      {/* --- Filters Bar with Search --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        
        {/* SEARCH BAR ROW */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
          <div className="relative w-full sm:max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search by Market, Store, DM, or Reason..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button onClick={handleExport} disabled={rows.length === 0 || isLoading} className="bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm">
            Export Page CSV
          </button>
        </div>

        {/* API FILTERS */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Market</label>
            <input type="text" value={selectedMarket || "All"} className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed" disabled />
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

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Year</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={year} onChange={(e) => setYear(Number(e.target.value))}>
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
              className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {monthOptions.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- Data Table --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize">Variance History</h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{rows.length} records shown</span>
          </div>
          
          <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full shadow-sm">
            Filtered Variance Total: ${fmt(grandTotals.variance)}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</th>
                <th className="w-[140px] min-w-[140px] max-w-[140px] px-3 py-3 sticky left-[100px] bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Market</th>
                <th className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-3 sticky left-[240px] bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Store</th>
                <th className="px-3 py-3">DM Name</th>
                <th className="px-3 py-3 text-right">Variance</th>
                <th className="px-3 py-3 text-right">Resolved</th>
                <th className="px-3 py-3 text-right">Pending</th>
                <th className="px-3 py-3 border-l border-slate-200">Reason</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan="10" className="py-12 text-center text-slate-500"><span className="animate-pulse">Loading data...</span></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="10" className="py-12 text-center text-slate-500 font-medium">No variance data found.</td></tr>
              ) : (
                rows.map((r, index) => {
                  let statusClass = "bg-slate-100 text-slate-700";
                  if ((r.status || "").toLowerCase() === "resolved") {
                    statusClass = "bg-emerald-100 text-emerald-700 border border-emerald-200";
                  } else if ((r.status || "").toLowerCase() === "pending") {
                    statusClass = "bg-amber-100 text-amber-700 border border-amber-200";
                  }

                  const vAmount = num(r.variance_amount ?? r.varianceamount);

                  return (
                    <tr key={r.id || index} className="hover:bg-blue-50 transition-colors group h-12">
                      <td className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r font-medium text-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {toISO(r.date)}
                      </td>
                      <td className="w-[140px] min-w-[140px] max-w-[140px] px-3 py-2 sticky left-[100px] bg-white group-hover:bg-blue-50 z-10 border-r font-semibold text-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {r.market ?? "-"}
                      </td>
                      <td className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-2 sticky left-[240px] bg-white group-hover:bg-blue-50 z-10 border-r font-bold text-slate-800 truncate shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {r.store ?? "-"}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-700">{r.dm_name ?? r.dmname ?? ""}</td>
                      <td className={`px-3 py-2 text-right font-mono ${vAmount < 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                        ${fmt(vAmount)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-600">${fmt(num(r.resolved_amount ?? r.resolvedamount))}</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-600">${fmt(num(r.pending_amount ?? r.pendingamount))}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate border-l border-slate-100" title={r.reason}>{r.reason ?? "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                          {r.status || "pending"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.approved_by ?? r.approvedby ?? "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>

              <tr className="bg-indigo-50/30 border-t border-indigo-100 uppercase tracking-wider">
                <td className="px-3 py-3 text-right font-extrabold text-indigo-900 sticky left-0 z-20 bg-indigo-50/30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" colSpan="4">
                  <span className="pr-4">Filtered Grand Total:</span>
                </td>
                <td className="px-3 py-3 text-right font-bold font-mono text-indigo-800">${fmt(grandTotals.variance)}</td>
                <td className="px-3 py-3 text-right font-bold font-mono text-emerald-700">${fmt(grandTotals.resolved)}</td>
                <td className="px-3 py-3 text-right font-bold font-mono text-amber-700">${fmt(grandTotals.pending)}</td>
                <td className="px-3 py-3 bg-indigo-50/30" colSpan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* --- Pagination Controls --- */}
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs font-bold text-slate-500">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors">Prev</button>
            <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0 || isLoading} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors">Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}