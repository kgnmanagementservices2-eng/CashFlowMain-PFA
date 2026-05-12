import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
// 🔥 Switched from fmt to fmt2 for precise 2-decimal formatting!
import { toISO, fmt2, num, downloadCSV } from "../utils/utils.js";
import FinancialCards from "../components/FinancialCards.jsx";
import SpecificDayFilter from "../components/SpecificDayFilter.jsx"; 

const ROWS_PER_PAGE = 20;

function getCurrentYearMonth() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}
function pad2(n) { return String(n).padStart(2, "0"); }
function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

export default function CombinedSalesExpenses({ onNavigate }) {
  const { selectedMarket, selectedStore } = useGlobalState();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  // Filter State
  const [uiYear, setUiYear] = useState(curY);
  const [uiMonth, setUiMonth] = useState(curM);
  const [uiMarket, setUiMarket] = useState(selectedMarket || "");
  const [uiStore, setUiStore] = useState(selectedStore || "");
  const [availableStores, setAvailableStores] = useState([]);

  // 🚀 Server-Side Pagination State
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totals, setTotals] = useState({});
  const [pageTotals, setPageTotals] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Search & Mutually Exclusive Dates
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);

  const [query, setQuery] = useState({ year: curY, month: curM, market: selectedMarket || "", store: selectedStore || "" });

  useEffect(() => { setSelectedSpecificDates([]); }, [uiMonth, uiYear]);

  useEffect(() => {
    setUiMarket(selectedMarket || "");
    setUiStore(selectedStore || "");
    setQuery(prev => ({ ...prev, market: selectedMarket || "", store: selectedStore || "" }));
  }, [selectedMarket, selectedStore]);

  useEffect(() => {
    if (selectedMarket) {
      api.getStores(selectedMarket)
        .then((data) => setAvailableStores((data || []).map(s => (typeof s === 'object' ? s.code || s.name : s)).filter(Boolean).sort()))
        .catch(console.error);
    } else setAvailableStores([]);
  }, [selectedMarket]);

  const { fromDate, toDate } = useMemo(() => {
    const lastDay = daysInMonth(query.year, query.month);
    return { fromDate: `${query.year}-${pad2(query.month)}-01`, toDate: `${query.year}-${pad2(query.month)}-${pad2(lastDay)}` };
  }, [query.year, query.month]);

  const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => (curY - 4) + i), [curY]);
  const monthOptions = [ { v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" }, { v: 4, label: "Apr" }, { v: 5, label: "May" }, { v: 6, label: "Jun" }, { v: 7, label: "Jul" }, { v: 8, label: "Aug" }, { v: 9, label: "Sep" }, { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" } ];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 🔥 Guarantee Mutually Exclusive Date Parameters
      let queryDateFrom = fromDate;
      let queryDateTo = toDate;
      let querySpecificDates = undefined;

      if (selectedSpecificDates.length > 0) {
        querySpecificDates = selectedSpecificDates.join(",");
        queryDateFrom = undefined;
        queryDateTo = undefined;
      }

      const response = await api.getDashboard({
        market: query.market || undefined,
        store: query.store || undefined,
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
      
      // Extract Grand Totals computed by Controller
      setTotals(response.summary?.totals || {});

      // Calculate Page Totals
      const pt = dataRows.reduce((acc, r) => {
        acc.sales_total = (acc.sales_total || 0) + num(r.sales_total);
        acc.expense_other = (acc.expense_other || 0) + num(r.expense_other);
        acc.expense_payroll = (acc.expense_payroll || 0) + num(r.expense_payroll);
        acc.expense_commission = (acc.expense_commission || 0) + num(r.expense_commission);
        acc.expense_total = (acc.expense_total || 0) + num(r.expense_total);
        acc.net = (acc.net || 0) + num(r.net);
        acc.cash_in_bank = (acc.cash_in_bank || 0) + num(r.cash_in_bank);
        acc.variance = (acc.variance || 0) + num(r.variance);
        return acc;
      }, {});
      setPageTotals(pt);

      // Lock dropdown from shrinking
      if (selectedSpecificDates.length === 0) {
        setAvailableDatesInMonth(response.summary?.availableDates || []);
      }

    } catch (e) {
      console.error("Failed to load combined data", e);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, query.market, query.store, searchTerm, currentPage, selectedSpecificDates]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setQuery({ year: uiYear, month: uiMonth, market: uiMarket, store: uiStore });
  };

  const handleExport = () => {
    const headers = [
      "Date", "Market", "Store", "POS Cash", "POS Card", "QPay", "Cash (Sales)", 
      "Store Expenses", "Payroll", "Commission", "Total Expenses", "Net", "Cash in Bank", "Variance"
    ];
    const lines = [headers.join(",")];
    
    rows.forEach((r) => {
      lines.push([
        r.date, `"${r.market || ""}"`, `"${r.store || ""}"`, r.pos_cash, r.pos_card, r.qpay,
        r.sales_total, r.expense_other, r.expense_payroll, r.expense_commission, r.expense_total,
        r.net, r.cash_in_bank, r.variance
      ].join(","));
    });
    downloadCSV(`combined_page_${currentPage}_${query.year}_${pad2(query.month)}.csv`, lines.join("\n"));
  };

  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto relative">
      <FinancialCards 
        sales={totals.sales_total || 0} 
        bank={totals.cash_in_bank || 0} 
        pickup={totals.pickup || 0}
        expenses={totals.expense_total || 0} 
        storeExpenses={totals.expense_other || 0} 
        payroll={totals.expense_payroll || 0} 
        commission={totals.expense_commission || 0} 
        openingBalance={totals.opening_balance || 0} // 🔥 PASSED TO FINANCIAL CARDS
        loading={isLoading}
        onNavigate={onNavigate} // 🔥 PASSED DOWN SO CARDS ARE CLICKABLE
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
          <div className="relative w-full sm:max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search by Market or Store..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" />
          </div>
          <button onClick={handleExport} disabled={rows.length === 0 || isLoading} className="bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm px-6 py-2 rounded-lg whitespace-nowrap shadow-sm transition-colors">Export Page CSV</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-7 gap-3 sm:gap-4 items-end">
          <div><label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Year</label><select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full outline-none" value={uiYear} onChange={(e) => setUiYear(Number(e.target.value))}>{yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Month</label>
              <SpecificDayFilter availableDates={availableDatesInMonth} selectedDates={selectedSpecificDates} onChange={setSelectedSpecificDates} />
            </div>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full outline-none" value={uiMonth} onChange={(e) => setUiMonth(Number(e.target.value))}>{monthOptions.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}</select>
          </div>
          
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Market</label>
            <input type="text" value={uiMarket || "All markets"} disabled className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>         
          
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Store</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full outline-none bg-white" value={uiStore} onChange={(e) => setUiStore(e.target.value)}><option value="">All Stores</option>{availableStores.map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          
          <div className="lg:col-span-1">
            <button onClick={handleApplyFilters} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-sm px-4 py-2 rounded-md w-full shadow-sm transition-colors">{isLoading ? "Loading..." : "Load Data"}</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 capitalize">Combined Sales & Expenses</h2>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{rows.length} records shown</span>
        </div>
        
        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                {/* 🔒 LOCKED COLUMNS */}
                <th className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</th>
                <th className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-3 sticky left-[100px] bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Market/Store</th>
                
                <th className="px-3 py-3 text-right">Cash (Sales)</th>
                <th className="px-3 py-3 text-right">Store Exp</th>
                <th className="px-3 py-3 text-right">Payroll</th>
                <th className="px-3 py-3 text-right">Comm</th>
                <th className="px-3 py-3 text-right text-rose-600 border-l border-slate-200">Total Exp</th>
                <th className="px-3 py-3 text-right text-indigo-700 bg-indigo-50/50">Net (Profit)</th>
                <th className="px-3 py-3 text-right bg-slate-100 border-l-2 border-slate-200">Cash in Bank</th>
                <th className="px-3 py-3 text-right font-extrabold text-slate-700 bg-slate-50">Variance</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan="10" className="py-12 text-center text-slate-500">Loading Data...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="10" className="py-12 text-center text-slate-500 font-medium">No data to display</td></tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={r.unique_id || idx} className="hover:bg-blue-50 transition-colors group h-12">
                    <td className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r font-medium text-slate-700">{r.date}</td>
                    <td className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-2 sticky left-[100px] bg-white group-hover:bg-blue-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="font-semibold text-slate-800 truncate">{r.store || "-"}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{r.market || "-"}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">${fmt2(r.sales_total)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">${fmt2(r.expense_other)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">${fmt2(r.expense_payroll)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">${fmt2(r.expense_commission)}</td>
                    <td className="px-3 py-2 text-right text-rose-600 font-bold border-l border-slate-100 bg-rose-50/10">${fmt2(r.expense_total)}</td>
                    <td className={`px-3 py-2 text-right font-extrabold bg-indigo-50/20 ${r.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>${fmt2(r.net)}</td>
                    <td className="px-3 py-2 text-right font-mono bg-slate-50/50 border-l-2 border-slate-100">${fmt2(r.cash_in_bank)}</td>
                    <td className={`px-3 py-2 text-right font-extrabold tracking-tight bg-slate-50/30 ${r.variance >= 0 ? "text-indigo-600" : "text-orange-600"}`}>${fmt2(r.variance)}</td>
                  </tr>
                ))
              )}
            </tbody>
            
            <tfoot>
              {/* GRAND TOTALS */}
              <tr className="font-bold bg-indigo-50/30 border-t border-indigo-100 text-indigo-900 uppercase tracking-wider">
                <td className="px-3 py-3 text-right text-indigo-900 sticky left-0 z-20 bg-indigo-50/30" colSpan="2"><span className="pr-4">Filtered Grand Total:</span></td>
                <td className="px-3 py-3 text-right">${fmt2(totals.sales_total || 0)}</td>
                <td className="px-3 py-3 text-right font-mono text-indigo-800">${fmt2(totals.expense_other || 0)}</td>
                <td className="px-3 py-3 text-right font-mono text-indigo-800">${fmt2(totals.expense_payroll || 0)}</td>
                <td className="px-3 py-3 text-right font-mono text-indigo-800">${fmt2(totals.expense_commission || 0)}</td>
                <td className="px-3 py-3 text-right text-rose-600 font-bold border-l border-indigo-200">${fmt2(totals.expense_total || 0)}</td>
                <td className={`px-3 py-3 text-right font-extrabold bg-indigo-100/50 ${(totals.net || 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>${fmt2(totals.net || 0)}</td>
                <td className="px-3 py-3 text-right bg-indigo-50 border-l-2 border-indigo-200">${fmt2(totals.cash_in_bank || 0)}</td>
                <td className={`px-3 py-3 text-right font-extrabold tracking-tight bg-indigo-100/30 ${(totals.variance || 0) >= 0 ? "text-indigo-700" : "text-orange-700"}`}>${fmt2(totals.variance || 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs font-bold text-slate-500">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors">Prev</button>
            <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0 || isLoading} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors">Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}