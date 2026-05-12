import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
import { todayCST, fmt, num, toISO, downloadCSV } from "../utils/utils.js";
import FinancialCards from "../components/FinancialCards.jsx";
import SpecificDayFilter from "../components/SpecificDayFilter.jsx";
import BookClosedPopup from "../components/BookClosedPopup.jsx";

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

export default function InHandCashPage({ onNavigate }) {
  const { selectedMarket, selectedStore } = useGlobalState();

  // --- Date Filters ---
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);
  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);

  // --- Store & Status State ---
  const [availableStores, setAvailableStores] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]); // For Data Entry
  const [storeAmounts, setStoreAmounts] = useState({}); // For Data Entry
  
  // Filter States
  const [filterStore, setFilterStore] = useState(""); 
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Search & Specific Day State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);

  // Auto-clear selected dates when the Month or Year changes
  useEffect(() => {
    setSelectedSpecificDates([]);
  }, [month, year]);

  // Sync Global Store to Local Filter
  useEffect(() => {
    setFilterStore(selectedStore || "");
  }, [selectedStore]);

  // Derived date range
  const { fromDate, toDate } = useMemo(() => {
    const lastDay = daysInMonth(year, month);
    const from = `${year}-${pad2(month)}-01`;
    const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
    return { fromDate: from, toDate: to };
  }, [year, month]);

  // --- Server-Side Pagination State ---
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- Totals State ---
  const [pageTotals, setPageTotals] = useState({ entry: 0, total: 0 });
  const [grandTotals, setGrandTotals] = useState({ cash_entry: 0, total_amount: 0 });

  // --- Financial Data State ---
  const [financials, setFinancials] = useState({
    sales: 0, bank: 0, pickup: 0, expenses: 0, 
    storeExpenses: 0, payroll: 0, commission: 0, variance: 0, openingBalance: 0
  });

  // Calculated Form Values
  const [date, setDate] = useState(todayCST());
  const [cashEntryTotal, setCashEntryTotal] = useState("0.00");
  
  // UI Flags
  const [isCalculating, setIsCalculating] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showClosedPopup, setShowClosedPopup] = useState(false); 

  // --- 1. Fetch Stores ---
  useEffect(() => {
    if (selectedMarket) {
      api.getStores(selectedMarket).then((data) => {
        const list = (data || []).map((s) => s.name || s.code || s).filter(Boolean).sort();
        setAvailableStores(list);
      }).catch(console.error);
    } else {
      setAvailableStores([]);
    }
  }, [selectedMarket]);

  // --- 2. Calculate Cash Entry Total ---
  useEffect(() => {
    const total = Object.values(storeAmounts).reduce((sum, amt) => sum + (num(amt) || 0), 0);
    setCashEntryTotal(fmt(total));
  }, [storeAmounts]);

  // --- 3. Form Actions ---
  const addStore = (storeName) => {
    if (storeName && !selectedStores.includes(storeName)) {
      setSelectedStores([...selectedStores, storeName]);
      setStoreAmounts((prev) => ({ ...prev, [storeName]: "" }));
    }
  };

  const removeStore = (storeName) => {
    setSelectedStores(selectedStores.filter((s) => s !== storeName));
    setStoreAmounts((prev) => {
      const updated = { ...prev };
      delete updated[storeName];
      return updated;
    });
  };

  const updateAmount = (storeName, val) => {
    const clean = val.replace(/[^0-9.]/g, "");
    setStoreAmounts((prev) => ({ ...prev, [storeName]: clean }));
  };

  // Reset Pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMarket, filterStore, filterStatus, year, month, searchTerm, selectedSpecificDates]);

  // --- 4. Load Data & Logic ---
  const loadData = useCallback(async (signal) => {
    setIsCalculating(true);

    try {
      // Guarantee Mutually Exclusive Date Parameters
      let queryDateFrom = fromDate;
      let queryDateTo = toDate;
      let querySpecificDates = undefined;

      if (selectedSpecificDates.length > 0) {
        querySpecificDates = selectedSpecificDates.join(",");
        queryDateFrom = undefined;
        queryDateTo = undefined;
      }

      // 1. TABLE DATA (Server-Side Paginated)
      const cashData = await api.listMarketCash({
        market: selectedMarket || undefined,
        store: filterStore || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        date_from: queryDateFrom,
        date_to: queryDateTo,
        specific_dates: querySpecificDates,
        search: searchTerm || undefined,
        page: currentPage,
        limit: ROWS_PER_PAGE
      });

      if (signal?.aborted) return;

      const dataRows = cashData.data || [];
      setRows(dataRows);
      setTotalPages(cashData.pagination?.totalPages || 1);
      setGrandTotals(cashData.summary?.totals || { cash_entry: 0, total_amount: 0 });

      if (selectedSpecificDates.length === 0) {
        setAvailableDatesInMonth(cashData.summary?.availableDates || []);
      }

      let ptEntry = 0, ptTotal = 0;
      dataRows.forEach(r => {
        ptEntry += num(r.cash_entry);
        ptTotal += num(r.total_amount);
      });
      setPageTotals({ entry: ptEntry, total: ptTotal });

      // 2. DASHBOARD TOTALS (For Financial Cards - Works for "All Markets")
      const dashboard = await api.getDashboard({
        market: selectedMarket, // Will be "" if All Markets is selected
        store: filterStore || undefined,
        date_from: fromDate,
        date_to: toDate,
      });

      if (signal?.aborted) return;

      const totals = dashboard?.summary?.totals || dashboard?.totals || {};

      setFinancials({
        sales: num(totals.sales_total || totals.sales),
        bank: num(totals.cash_in_bank || totals.bank),
        pickup: num(totals.pickup),
        expenses: num(totals.expense_other || totals.expenses) + num(totals.expense_payroll || totals.payroll) + num(totals.expense_commission || totals.commission),
        storeExpenses: num(totals.expense_other || totals.expenses),
        payroll: num(totals.expense_payroll || totals.payroll),
        commission: num(totals.expense_commission || totals.commission),
        variance: num(totals.variance),
        openingBalance: num(totals.opening_balance), // Dynamically fetched from Dashboard!
      });

    } catch (err) {
      if (!signal?.aborted) console.error("Load error:", err);
    } finally {
      if (!signal?.aborted) setIsCalculating(false);
    }
  }, [selectedMarket, filterStore, filterStatus, fromDate, toDate, searchTerm, selectedSpecificDates, currentPage, year, month]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);


  // --- Submit Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!selectedMarket) newErrors.market = "Market is required";
    if (selectedStores.length === 0) newErrors.store = "Select at least one store";
    if (!date) newErrors.date = "Date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setMessage("Saving...");

    try {
      const promises = selectedStores.map((storeName) => {
        const amountVal = num(storeAmounts[storeName] || "0");

        return api.createMarketCash({
          date,
          market: selectedMarket,
          store: storeName,
          cash_entry: amountVal, 
          carry_forwarded_amount: 0, 
        });
      });

      await Promise.all(promises);

      setMessage("Saved ✅");
      setSelectedStores([]);
      setStoreAmounts({});
      setCashEntryTotal("0.00");
      
      const controller = new AbortController();
      await loadData(controller.signal);
    } catch (err) {
      console.error(err);
      if (err?.message === "Book closed for the month. Contact admin." || err?.error === "BOOK_CLOSED") {
        setShowClosedPopup(true);
        setMessage("");
      } else {
        setMessage(err?.message || "Failed");
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(""), 2000);
    }
  };

  const handleExport = () => {
    if (!rows || rows.length === 0) return alert("No data to export.");
    const header = ["Date", "Market", "Store", "Amount", "Status", "Audit", "Total"];
    const lines = [header.join(",")];
    
    rows.forEach((r) => {
      lines.push([
        toISO(r.date),
        (r.market ?? "").replaceAll(",", " "),
        (r.store ?? "").replaceAll(",", " "),
        fmt(r.cash_entry),
        r.status || "pending",
        r.audit_status || "pending",
        fmt(r.total_amount),
      ].join(","));
    });
    downloadCSV(`pickup-amount-${year}-${pad2(month)}.csv`, lines.join("\n"));
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
      
      {/* 1. FINANCIAL CARDS */}
<FinancialCards 
        sales={financials.sales}
        bank={financials.bank}
        pickup={financials.pickup}
        expenses={financials.expenses}
        storeExpenses={financials.storeExpenses}
        payroll={financials.payroll}
        commission={financials.commission}
        openingBalance={financials.openingBalance}
        loading={isCalculating}
        onNavigate={onNavigate} // 🔥 PASSED DOWN SO CARDS ARE CLICKABLE
      />

      {/* 2. MULTI-STORE ENTRY FORM */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 transition-all">
        <h2 className="text-lg font-bold text-slate-800 mb-5 tracking-tight border-b border-slate-100 pb-3">
          Add Pick Up Amount
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} 
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-shadow ${errors.date ? "border-rose-500 bg-rose-50" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`} 
            />
            {errors.date && <p className="text-xs text-rose-600 mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Add Store</label>
            <select 
              onChange={(e) => { addStore(e.target.value); e.target.value = ""; }} 
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-shadow bg-white ${errors.store ? "border-rose-500 bg-rose-50" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`} 
              disabled={!selectedMarket}
            >
              <option value="">Select Store...</option>
              {availableStores.filter(s => !selectedStores.includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.store && <p className="text-xs text-rose-600 mt-1">{errors.store}</p>}
          </div>
        </div>

        {/* Selected Stores List */}
        <div className="space-y-2 mb-5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          {selectedStores.map(storeName => (
            <div key={storeName} className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-lg shadow-sm">
              <span className="flex-1 text-sm font-bold text-slate-700 truncate">{storeName}</span>
              <input 
                type="text" inputMode="decimal" value={storeAmounts[storeName] || ""} 
                onChange={(e) => updateAmount(storeName, e.target.value)} 
                placeholder="Amount" 
                className="border border-slate-300 rounded px-2 py-1.5 text-sm w-32 text-right outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold" 
              />
              <button type="button" onClick={() => removeStore(storeName)} className="text-rose-400 hover:text-rose-600 text-sm font-bold px-2 transition-colors">✕</button>
            </div>
          ))}
          {selectedStores.length === 0 && (
            <div className="text-sm text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-lg text-center bg-slate-50/50">
              No stores selected yet. Select a store above to assign an amount.
            </div>
          )}
        </div>

        {/* Totals & Submit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end border-t border-slate-100 pt-5">
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex flex-col items-center justify-center h-[72px]">
            <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wide mb-1">Total Entry</label>
            <div className="text-xl font-extrabold text-emerald-900 font-mono">${cashEntryTotal}</div>
          </div>
          <button 
            onClick={handleSubmit} 
            disabled={isSaving || isCalculating || selectedStores.length === 0} 
            className={`w-full py-3 rounded-lg font-bold text-sm shadow-md transition-all h-[72px] ${
              selectedStores.length > 0 && !isSaving 
              ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isSaving ? "Saving..." : "Save Entry"}
          </button>
        </div>
        {message && <p className="mt-3 text-center text-sm font-bold text-emerald-600">{message}</p>}
      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        {/* Search Bar Row */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
          <div className="relative w-full sm:max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search by Store, Market, or Status..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button onClick={handleExport} disabled={rows.length === 0 || isCalculating} className="bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap">
            Export CSV
          </button>
        </div>

        {/* Dynamic Filters */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Year</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
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
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {monthOptions.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Market</label>
            <input type="text" value={selectedMarket || "All"} className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed" readOnly />
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Store</label>
            <select 
              className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={filterStore} 
              onChange={(e) => setFilterStore(e.target.value)}
            >
              <option value="">All Stores</option>
              {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. HISTORY TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 capitalize">Pick Up History</h2>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{rows.length} records shown</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</th>
                <th className="px-3 py-3">Market</th>
                <th className="px-3 py-3 border-r border-slate-200">Store</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3 text-right bg-emerald-50/50 text-emerald-800">Pick Up Amount</th>
                <th className="px-3 py-3 text-right font-extrabold text-slate-700 bg-indigo-50/30">Total</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 bg-white">
              {isCalculating ? (
                <tr><td colSpan="6" className="py-8 text-center text-slate-500 font-medium">Loading data...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="6" className="py-8 text-center text-slate-500 font-medium">No data found</td></tr>
              ) : (
                rows.map((r, i) => {
                  const entry = num(r.cash_entry ?? 0);
                  const totalAmount = num(r.total_amount ?? entry);

                  let statusColor = "bg-amber-100 text-amber-700";
                  if (r.status === "approved") statusColor = "bg-emerald-100 text-emerald-700";
                  if (r.status === "rejected") statusColor = "bg-rose-100 text-rose-700";

                  return (
                    <tr key={r.id || i} className="hover:bg-blue-50 transition-colors group h-12">
                      <td className="px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium text-slate-700">
                        {toISO(r.date)}
                      </td>
                      <td className="px-3 py-2 font-medium">{r.market || "-"}</td>
                      <td className="px-3 py-2 border-r border-slate-100">
                        <span className="font-semibold text-slate-800">{r.store || "-"}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                          {r.status || "pending"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700 bg-emerald-50/10">
                        ${fmt(entry)}
                      </td>
                      <td className="px-3 py-2 text-right font-extrabold text-slate-900 bg-indigo-50/10">
                        ${fmt(totalAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            
            <tfoot>
              {/* GRAND TOTALS */}
              <tr className="bg-indigo-50/30 border-t border-indigo-100 uppercase tracking-wider">
                <td className="px-3 py-3 text-right font-extrabold text-indigo-900 sticky left-0 z-20 bg-indigo-50/30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" colSpan="4">
                  <span className="pr-4">Filtered Grand Total:</span>
                </td>
                <td className="px-3 py-3 text-right font-bold font-mono text-emerald-800 bg-emerald-100/30">${fmt(grandTotals.cash_entry)}</td>
                <td className="px-3 py-3 text-right font-extrabold font-mono text-indigo-900 bg-indigo-100/50">${fmt(grandTotals.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs font-bold text-slate-500">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={handlePrevPage} disabled={currentPage === 1 || isCalculating} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors">Prev</button>
            <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0 || isCalculating} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors">Next</button>
          </div>
        </div>
      </div>

      {/* --- BOOK CLOSED POPUP --- */}
      <BookClosedPopup 
        isOpen={showClosedPopup} 
        onClose={() => setShowClosedPopup(false)} 
      />

    </section>
  );
}