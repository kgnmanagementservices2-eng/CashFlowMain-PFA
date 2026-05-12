import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
// 🔥 Switched from fmt to fmt2 for precise 2-decimal formatting!
import { fmt2, num, toISO, downloadCSV } from "../utils/utils.js";
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

export default function SalesPage() {
  const { selectedMarket, selectedStore } = useGlobalState();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  // --- Filter State ---
  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);
  
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
  const [pageTotals, setPageTotals] = useState({ cash: 0, card: 0, qpay: 0, cashinbank: 0, total: 0 });
  const [grandTotals, setGrandTotals] = useState({ cash: 0, card: 0, qpay: 0, cashinbank: 0, total_sales: 0 });

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
  }, [selectedMarket, fStore, year, month, searchTerm, selectedSpecificDates]);

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

      const response = await api.getAdminSalesAll({
        market: selectedMarket || undefined,
        store: fStore || undefined,
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
      setGrandTotals(response.summary?.totals || { cash: 0, card: 0, qpay: 0, cashinbank: 0, total_sales: 0 });

      if (selectedSpecificDates.length === 0) {
        setAvailableDatesInMonth(response.summary?.availableDates || []);
      }

      // Calculate strictly Page Totals for UI reference
      let ptCash = 0, ptCard = 0, ptQpay = 0, ptBank = 0;
      dataRows.forEach(r => {
        ptCash += num(r.pos_cash);
        ptCard += num(r.pos_debit);
        ptQpay += num(r.qpay_payment);
        ptBank += num(r.cashinbank);
      });
      setPageTotals({ cash: ptCash, card: ptCard, qpay: ptQpay, cashinbank: ptBank, total: ptCash + ptCard + ptQpay });

    } catch (err) {
      console.error("Failed to load sales data", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMarket, fStore, fromDate, toDate, searchTerm, currentPage, selectedSpecificDates]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Handle Export ---
  const handleExport = () => {
    if (!rows || rows.length === 0) return alert("No data to export.");

    const headers = [
      "Date", "Market", "Store", "POS Cash", "POS Card", "QPay", "Cash in Bank", "Total Sales"
    ];
    const lines = [headers.join(",")];
    
    rows.forEach((r) => {
      const cash = num(r.pos_cash);
      const card = num(r.pos_debit);
      const qpay = num(r.qpay_payment);
      const cashinbank = num(r.cashinbank);
      const total = cash + card + qpay;
      lines.push([
        toISO(r.date),
        (r.market ?? "").replaceAll(",", " "),
        (r.store ?? "").replaceAll(",", " "),
        cash, card, qpay, cashinbank, total,
      ].join(","));
    });

    downloadCSV(`sales_page_${currentPage}_${year}_${pad2(month)}.csv`, lines.join("\n"));
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
              placeholder="Search by Market or Store..." 
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
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 items-end">
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
        </div>
      </div>

      {/* --- Data Table --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize">Sales History</h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{rows.length} records shown</span>
          </div>
          
          {/* 🔥 Server-Side Calculated Grand Total Tag */}
          <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full shadow-sm">
            Filtered Grand Total: ${fmt2(grandTotals.total_sales)}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</th>
                <th className="w-[140px] min-w-[140px] max-w-[140px] px-3 py-3 sticky left-[100px] bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Market</th>
                <th className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-3 sticky left-[240px] bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Store</th>
                
                <th className="px-3 py-3 text-right">POS Cash</th>
                <th className="px-3 py-3 text-right">POS Card</th>
                <th className="px-3 py-3 text-right">QPay</th>
                <th className="px-3 py-3 text-right bg-slate-100 border-l border-slate-200">Cash in Bank</th>
                <th className="px-3 py-3 text-right font-extrabold text-indigo-700 bg-indigo-50/50">Total Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan="8" className="py-12 text-center text-slate-500"><span className="animate-pulse">Loading data...</span></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="8" className="py-12 text-center text-slate-500 font-medium">No sales data found.</td></tr>
              ) : (
                rows.map((r, index) => {
                  const cash = num(r.pos_cash);
                  const card = num(r.pos_debit);
                  const qpay = num(r.qpay_payment);
                  const cashinbank = num(r.cashinbank);
                  const total = cash + card + qpay;
                  
                  return (
                    <tr key={r.unique_id || index} className="hover:bg-blue-50 transition-colors group h-12">
                      <td className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r font-medium text-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {toISO(r.date)}
                      </td>
                      <td className="w-[140px] min-w-[140px] max-w-[140px] px-3 py-2 sticky left-[100px] bg-white group-hover:bg-blue-50 z-10 border-r font-semibold text-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {r.market ?? "-"}
                      </td>
                      <td className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-2 sticky left-[240px] bg-white group-hover:bg-blue-50 z-10 border-r font-bold text-slate-800 truncate shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {r.store ?? "-"}
                      </td>
                      
                      {/* 🔥 Formatted to exact 2 decimals */}
                      <td className="px-3 py-2 text-right font-mono text-slate-600">${fmt2(cash)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">${fmt2(card)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">${fmt2(qpay)}</td>
                      <td className="px-3 py-2 text-right font-mono bg-slate-50/50 border-l border-slate-100">${fmt2(cashinbank)}</td>
                      <td className="px-3 py-2 text-right font-mono font-extrabold text-indigo-700 bg-indigo-50/20">${fmt2(total)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/30 border-t border-indigo-100 uppercase tracking-wider">
                <td className="px-3 py-3 text-right font-extrabold text-indigo-900 sticky left-0 z-20 bg-indigo-50/30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" colSpan="3">
                  <span className="pr-4">Filtered Grand Total:</span>
                </td>
                {/* 🔥 Grand totals formatted to exact 2 decimals */}
                <td className="px-3 py-3 text-right font-bold font-mono text-indigo-800">${fmt2(grandTotals.cash)}</td>
                <td className="px-3 py-3 text-right font-bold font-mono text-indigo-800">${fmt2(grandTotals.card)}</td>
                <td className="px-3 py-3 text-right font-bold font-mono text-indigo-800">${fmt2(grandTotals.qpay)}</td>
                <td className="px-3 py-3 text-right font-bold font-mono text-indigo-800 bg-indigo-50 border-l border-indigo-200">${fmt2(grandTotals.cashinbank)}</td>
                <td className="px-3 py-3 text-right font-extrabold font-mono text-indigo-900 bg-indigo-100/50">${fmt2(grandTotals.total_sales)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

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