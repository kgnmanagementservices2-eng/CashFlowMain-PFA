import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
import { todayCST, fmt, num, toISO, downloadCSV } from "../utils/utils.js";
import SpecificDayFilter from "../components/SpecificDayFilter.jsx";

// 🔥 Added React DatePicker imports
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- Pagination Settings ---
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

// 🔥 Helpers to safely convert between "YYYY-MM-DD" and JS Date objects
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d);
};

const formatDate = (dateObj) => {
  if (!dateObj) return "";
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function TillPage() {
  const { selectedMarket, selectedStore } = useGlobalState();

  // --- Filter Controls ---
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);
  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);

  // --- Derived date window ---
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
  const [isLoading, setIsLoading] = useState(false);

  // --- Search & Date State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);

  // --- Totals State ---
  const [pageTotals, setPageTotals] = useState({ start: 0, end: 0, cf: 0, chg: 0 });
  const [grandTotals, setGrandTotals] = useState({ start: 0, end: 0, cf: 0, chg: 0 });

  // --- Form State ---
  const [date, setDate] = useState(todayCST());
  const [storeName, setStoreName] = useState("");
  const [cashAtStart, setCashAtStart] = useState("");
  const [cashAtEnd, setCashAtEnd] = useState("");
  const [carryForward, setCarryForward] = useState("");
  const [message, setMessage] = useState("");
  const [refreshBal, setRefreshBal] = useState(0); 

  // Validation State
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Auto-clear specific dates when month/year change
  useEffect(() => { setSelectedSpecificDates([]); }, [month, year]);

  // --- 1. Load Stores for Dropdowns ---
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

  // Sync Global Store Selection to Filter & Form
  useEffect(() => {
    setFStore(selectedStore || "");
    setStoreName(selectedStore || "");
  }, [selectedStore]);

  const handleFStoreChange = (e) => {
    const val = e.target.value;
    setFStore(val);
    setStoreName(val);
  };

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMarket, fStore, year, month, searchTerm, selectedSpecificDates]);

  // --- 2. Load Till Table Data (SERVER-SIDE) ---
  const loadTill = useCallback(async () => {
    setIsLoading(true);
    try {
      let queryDateFrom = fromDate;
      let queryDateTo = toDate;
      let querySpecificDates = undefined;

      if (selectedSpecificDates.length > 0) {
        querySpecificDates = selectedSpecificDates.join(",");
        queryDateFrom = undefined;
        queryDateTo = undefined;
      }

      const response = await api.listTill({
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
      
      // Calculate Grand Totals
      const gt = response.summary?.totals || { start: 0, end: 0, cf: 0 };
      setGrandTotals({ ...gt, chg: gt.end - gt.start });

      if (selectedSpecificDates.length === 0) {
        setAvailableDatesInMonth(response.summary?.availableDates || []);
      }

      // Calculate strictly Page Totals for UI
      let ptStart = 0, ptEnd = 0, ptCf = 0;
      dataRows.forEach(r => {
        ptStart += num(r.cash_at_start ?? r.cashAtStart);
        ptEnd += num(r.cash_at_end ?? r.cashAtEnd);
        ptCf += num(r.carry_forward ?? r.carryForward);
      });
      setPageTotals({ start: ptStart, end: ptEnd, cf: ptCf, chg: ptEnd - ptStart });

    } catch (err) {
      console.error("Failed to load till table data", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMarket, fStore, fromDate, toDate, searchTerm, currentPage, selectedSpecificDates]);

  useEffect(() => {
    loadTill();
  }, [loadTill]);

  // 🛡️ CRITICAL FIX: Dedicated fetch for Opening Balance when Form Store changes
  useEffect(() => {
    let isMounted = true;

    const fetchOpeningBalance = async () => {
      if (!storeName) {
        setCashAtStart("");
        return;
      }
      try {
        // Fetch ONLY the data for the store selected in the Form (limit 1 for speed)
        const response = await api.listTill({ 
          market: selectedMarket || undefined, 
          store: storeName,
          limit: 1 
        });
        
        if (!isMounted) return;

        const latestRecord = response.data?.[0];
        
        if (latestRecord) {
          const latestCF = num(latestRecord.carry_forward ?? latestRecord.carryForward);
          setCashAtStart(latestCF ? String(latestCF) : "0");
        } else {
          setCashAtStart(""); // No history for this store yet
        }
      } catch (err) {
        console.error("Failed to fetch opening balance", err);
      }
    };

    fetchOpeningBalance();

    return () => { isMounted = false; };
  }, [storeName, selectedMarket, refreshBal]);


  // --- Validation ---
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!storeName?.trim()) newErrors.storeName = "Store name is required";
    
    const numericEnd = num(cashAtEnd) || 0;
    if (!cashAtEnd?.trim() || numericEnd <= 0) newErrors.cashAtEnd = "Closing balance must be > 0";
    
    const numericCarry = num(carryForward) || 0;
    if (!carryForward?.trim() || numericCarry < 0) newErrors.carryForward = "Carry forward is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [storeName, cashAtEnd, carryForward]);

  useEffect(() => {
    validateForm();
  }, [validateForm]);

  const isFormValid = useMemo(() => Object.keys(errors).length === 0 && !isSaving, [errors, isSaving]);

  // --- Submit Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid) {
      setMessage("Please fix errors before saving");
      setTimeout(() => setMessage(""), 2500);
      return;
    }

    setIsSaving(true);
    setMessage("Saving...");

    const payload = {
      date,
      market: selectedMarket,
      store_name: storeName.trim(),
      cash_at_start: num(cashAtStart) || null, 
      cash_at_end: num(cashAtEnd),
      carry_forward: num(carryForward),
    };

    try {
      await api.createTill(payload);
      setMessage("Saved ✅");
      setCashAtEnd("");
      setCarryForward("");
      
      // Refresh both the table AND the opening balance calculation
      await loadTill();
      setRefreshBal(prev => prev + 1); 

    } catch (err) {
      setMessage(err.message || "Failed");
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(""), 2000);
    }
  };

  // --- Export CSV ---
  const handleExport = () => {
    if (!rows || rows.length === 0) return alert("No data to export.");
    const header = [
      "Date", "Market", "Store", "Cash Start", 
      "Cash End", "Carry Forward", "Difference (+/-)",
    ];
    const lines = [header.join(",")];
    
    rows.forEach((r) => {
      const start = num(r.cash_at_start ?? r.cashAtStart);
      const end = num(r.cash_at_end ?? r.cashAtEnd);
      const cf = num(r.carry_forward ?? r.carryForward);
      const chg = end - start;

      const vals = [
        toISO(r.date),
        (r.market ?? "").replaceAll(",", " "),
        (r.store_name ?? r.storeName ?? "").replaceAll(",", " "),
        fmt(start),
        fmt(end),
        fmt(cf),
        fmt(chg),
      ];
      lines.push(vals.join(","));
    });
    downloadCSV(`till-history-${fStore || selectedMarket || "all"}-${year}-${pad2(month)}.csv`, lines.join("\n"));
  };

  // Pagination controls
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  // Dropdown options
  const yearOptions = useMemo(() => {
    const start = curY - 4;
    return Array.from({ length: 6 }, (_, i) => start + i);
  }, [curY]);
  
  const monthOptions = useMemo(
    () => [
      { v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" }, 
      { v: 4, label: "Apr" }, { v: 5, label: "May" }, { v: 6, label: "Jun" }, 
      { v: 7, label: "Jul" }, { v: 8, label: "Aug" }, { v: 9, label: "Sep" }, 
      { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" },
    ],
    []
  );

  return (
    <section className="pl-4 pr-4 sm:p-6 lg:pl-6 pt-4 pb-4 sm:pt-6 sm:pb-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      
      {/* Year/Month/Store Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        
        {/* Search Bar Row */}
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Year</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={year} onChange={(e) => setYear(Number(e.target.value))}>
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
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {monthOptions.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Market</label>
            <input type="text" value={selectedMarket || "All"} className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed" readOnly />
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Store Filter</label>
            <select 
              className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              value={fStore} 
              onChange={handleFStoreChange}
            >
              <option value="">All Stores</option>
              {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* --- Form --- */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <form id="till-form" onSubmit={handleSubmit} className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          
          {/* 🔥 Professional Date Picker */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-semibold text-slate-800 mb-1">Date</label>
            <div className="relative w-full">
              <DatePicker
                id="date"
                dateFormat="MM/dd/yyyy"
                selected={parseDate(date)}
                onChange={(d) => setDate(formatDate(d))}
                required={true}
                placeholderText="MM/DD/YYYY"
                wrapperClassName="w-full"
                className="w-full border border-slate-300 rounded px-3 pr-10 py-2 text-sm outline-none transition-all duration-200 text-slate-800 bg-white hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {/* Custom Calendar Icon */}
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-semibold text-slate-800 mb-1">Market</label>
            <input id="market-display" type="text" value={selectedMarket || "All"} className="border rounded px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed" readOnly disabled />
          </div>
          
          {/* Form Store Selection */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-semibold text-slate-800 mb-1">Store name *</label>
            <select
              id="store_name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className={`border rounded px-3 py-2 text-sm w-full transition-colors bg-white ${errors.storeName ? "border-rose-500 bg-rose-50" : "border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"}`}
              required
            >
              <option value="">Select Store...</option>
              {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.storeName && <p className="mt-1 text-xs text-rose-600">{errors.storeName}</p>}
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center justify-between">
              Opening balance
              {!storeName && <span className="text-[10px] text-amber-600 font-normal ml-1 tracking-wide">(Select store)</span>}
            </label>
            <input
              id="cash_at_start"
              type="text"
              inputMode="decimal"
              value={cashAtStart}
              placeholder={!storeName ? "N/A" : ""}
              className="border rounded px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
              readOnly
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-semibold text-slate-800 mb-1">Closing balance *</label>
            <input
              id="cash_at_end"
              type="text"
              inputMode="decimal"
              value={cashAtEnd}
              onChange={(e) => setCashAtEnd(e.target.value)}
              className={`border rounded px-3 py-2 text-sm w-full transition-colors font-mono ${errors.cashAtEnd ? "border-rose-500 bg-rose-50" : "border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"}`}
              placeholder="e.g. 1345.50"
              required
            />
            {errors.cashAtEnd && <p className="mt-1 text-xs text-rose-600">{errors.cashAtEnd}</p>}
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-semibold text-slate-800 mb-1">Carry forward *</label>
            <input
              id="carry_forward"
              type="text"
              inputMode="decimal"
              value={carryForward}
              onChange={(e) => setCarryForward(e.target.value)}
              className={`border rounded px-3 py-2 text-sm w-full transition-colors font-mono ${errors.carryForward ? "border-rose-500 bg-rose-50" : "border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"}`}
              placeholder="e.g. 200"
              required
            />
            {errors.carryForward && <p className="mt-1 text-xs text-rose-600">{errors.carryForward}</p>}
          </div>
          <div className="sm:col-span-2 lg:col-span-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              type="submit"
              disabled={!isFormValid}
              className={`px-8 py-3 rounded-lg font-semibold text-sm w-full sm:w-auto transition-all shadow-md ${isFormValid ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]" : "bg-slate-300 cursor-not-allowed text-slate-500"}`}
            >
              {isSaving ? "Saving..." : isFormValid ? " Add Till" : `${Object.keys(errors).length || 0} issues to fix`}
            </button>
            <span id="msg" className="text-sm font-medium text-emerald-600">
              {message}
            </span>
          </div>
        </form>
      </div>

      {/* --- Data Table --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize">Recent Till Entries</h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{rows.length} records shown</span>
          </div>
          
          <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full shadow-sm">
            Filtered Variance: {grandTotals.chg > 0 ? "+" : ""}${fmt(grandTotals.chg)}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</th>
                <th className="w-[140px] min-w-[140px] max-w-[140px] px-3 py-3 sticky left-[100px] bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Market</th>
                <th className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-3 sticky left-[240px] bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Store</th>
                <th className="px-3 py-3 text-right">Cash start</th>
                <th className="px-3 py-3 text-right">Cash end</th>
                <th className="px-3 py-3 text-right">Carry forward</th>
                <th className="px-3 py-3 text-right">Difference (+/-)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan="7" className="py-12 text-center text-slate-500"><span className="animate-pulse">Loading data...</span></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-slate-500 font-medium">No till entries found.</td></tr>
              ) : (
                rows.map((r, index) => {
                  const start = num(r.cash_at_start ?? r.cashAtStart);
                  const end = num(r.cash_at_end ?? r.cashAtEnd);
                  const cf = num(r.carry_forward ?? r.carryForward);
                  const chg = end - start;

                  return (
                    <tr key={r.id || index} className={`transition-colors group h-12 ${chg < 0 ? "bg-rose-50/50 hover:bg-rose-100/50" : "hover:bg-blue-50"}`}>
                      <td className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r font-medium text-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {toISO(r.date)}
                      </td>
                      <td className="w-[140px] min-w-[140px] max-w-[140px] px-3 py-2 sticky left-[100px] bg-white group-hover:bg-blue-50 z-10 border-r font-semibold text-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {r.market ?? "-"}
                      </td>
                      <td className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-2 sticky left-[240px] bg-white group-hover:bg-blue-50 z-10 border-r font-bold text-slate-800 truncate shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {r.store_name ?? r.storeName ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">${fmt(start)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">${fmt(end)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">${fmt(cf)}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${chg < 0 ? "text-rose-700" : chg > 0 ? "text-emerald-700" : "text-slate-700"}`}>
                        {chg > 0 ? "+" : ""}{fmt(chg)}
                      </td>
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
                <td className="px-3 py-3 text-right font-bold font-mono text-indigo-800">${fmt(grandTotals.start)}</td>
                <td className="px-3 py-3 text-right font-bold font-mono text-indigo-800">${fmt(grandTotals.end)}</td>
                <td className="px-3 py-3 text-right font-bold font-mono text-indigo-800">${fmt(grandTotals.cf)}</td>
                <td className={`px-3 py-3 text-right font-extrabold font-mono ${grandTotals.chg < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {grandTotals.chg > 0 ? "+" : ""}{fmt(grandTotals.chg)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* --- Pagination Controls --- */}
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs font-bold text-slate-500">
            Page {totalPages > 0 ? currentPage : 0} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || isLoading}
              className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0 || isLoading}
              className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}