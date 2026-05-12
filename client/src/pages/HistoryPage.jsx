
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast"; 
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import { fmt2, num, toISO, downloadCSV } from "../utils/utils.js";

// Components
import TruncatedTooltip from "../components/TruncatedTooltip.jsx";
import SpecificDayFilter from "../components/SpecificDayFilter.jsx";
import BookClosedPopup from "../components/BookClosedPopup.jsx"; // 🔥 IMPORTED POPUP

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

export default function HistoryPage({ category = "payroll" }) {
  const { selectedMarket, selectedStore } = useGlobalState();
  const { user } = useAuth();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  // 1. Server-Side Pagination & Totals State
  const [rows, setRows] = useState([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageTotal, setPageTotal] = useState(0); 
  const [grandTotal, setGrandTotal] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);

  // 2. Filters
  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);
  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [auditFilter, setAuditFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [selectedDatePeriod, setSelectedDatePeriod] = useState("all");
  const [availableDatePeriods, setAvailableDatePeriods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Specific Dates State
  const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);

  // 3. Issue Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [activeIssueId, setActiveIssueId] = useState(null);
  const [issueNotes, setIssueNotes] = useState("");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // PAID MODAL
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [activePaidRow, setActivePaidRow] = useState(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paidReason, setPaidReason] = useState("");
  const [isSubmittingPaid, setIsSubmittingPaid] = useState(false);

  // 🔥 ADDED STATE FOR BOOK CLOSED POPUP
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  const fMarket = selectedMarket;

  // Auto-clear selected dates when the Month or Year changes
  useEffect(() => { setSelectedSpecificDates([]); }, [month, year]);

  // Load stores
  useEffect(() => {
    if (selectedMarket) {
      api.getStores(selectedMarket).then((data) => {
        setAvailableStores((data || []).map((s) => (typeof s === "object" ? s.code || s.name : s)).filter(Boolean).sort());
      }).catch(console.error);
    } else {
      setAvailableStores([]);
    }
  }, [selectedMarket]);

  useEffect(() => { setFStore(selectedStore || ""); }, [selectedStore]);

  const { fromDate, toDate } = useMemo(() => {
    const lastDay = daysInMonth(year, month);
    return { fromDate: `${year}-${pad2(month)}-01`, toDate: `${year}-${pad2(month)}-${pad2(lastDay)}` };
  }, [year, month]);

  // Reset to page 1 on filter changes 
  useEffect(() => {
    setCurrentPage(1);
  }, [fMarket, fStore, year, month, statusFilter, auditFilter, paymentStatusFilter, selectedDatePeriod, searchTerm, selectedSpecificDates]);

  // 4. SERVER-SIDE FETCHING
  const fetchFiltered = useCallback(async () => {
    setIsLoading(true);
    try {
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

      const response = await api.getPayrollExpenses({
        market: fMarket || undefined,
        store: fStore || undefined,
        category: category, 
        status: statusFilter === "all" ? undefined : statusFilter,
        audit_status: auditFilter === "all" ? undefined : auditFilter,
        payment_status: paymentStatusFilter === "all" ? undefined : paymentStatusFilter, 
        date_period: selectedDatePeriod === "all" ? undefined : selectedDatePeriod,
        date: queryDate,
        date_from: queryDateFrom,
        date_to: queryDateTo,
        specific_dates: querySpecificDates,
        search: searchTerm || undefined,
        page: currentPage,
        limit: ROWS_PER_PAGE,
      });

      const dataRows = response.data || [];
      setRows(dataRows);
      setTotalPages(response.pagination?.totalPages || 1);
      setGrandTotal(response.summary?.totalAmount || 0);

      if (selectedSpecificDates.length === 0) {
        setAvailableDatesInMonth(response.summary?.availableDates || []);
      }

      if (selectedDatePeriod === "all") {
        const periods = [...new Set(dataRows.map(r => r.date_period).filter(Boolean))].sort();
        setAvailableDatePeriods(periods);
      }

      let pt = 0;
      dataRows.forEach(r => { pt += num(r.net_final_pay ?? r.amount ?? r.amount_numeric ?? 0); });
      setPageTotal(pt);

    } catch (err) {
      console.error(`Failed to load payroll history`, err);
      toast.error("Failed to load history.");
    } finally {
      setIsLoading(false);
    }
  }, [fMarket, fStore, fromDate, toDate, statusFilter, auditFilter, paymentStatusFilter, selectedDatePeriod, searchTerm, currentPage, selectedSpecificDates, category]); 

  useEffect(() => { fetchFiltered(); }, [fetchFiltered]);

  // 5. Issue Handlers
  const openIssueModal = (row) => {
    setActiveIssueId(row.id);
    setIssueNotes(row.notes || "");
    setIsIssueModalOpen(true);
  };

  const submitIssue = async () => {
    if (!issueNotes.trim()) return toast.error("Notes are required to report an issue.");
    
    setIsSubmittingIssue(true);
    const toastId = toast.loading("Submitting issue...");
    
    try {
      // Find the row to pass date and market to middleware
      const row = rows.find(r => r.id === activeIssueId);
      
      await api.issuePayrollExpense(activeIssueId, { 
        notes: issueNotes,
        date: row?.date,     // 🔥 Passing for checkClosedBook
        market: row?.market  // 🔥 Passing for checkClosedBook
      });
      
      toast.success("Issue submitted and status reset to pending.", { id: toastId });
      setIsIssueModalOpen(false);
      fetchFiltered(); 
    } catch (err) {
      // 🔥 Catch Book Closed Error
      if (err?.message === "Book closed for the month. Contact admin." || err?.error === "BOOK_CLOSED") {
        toast.dismiss(toastId);
        setIsIssueModalOpen(false);
        setShowClosedPopup(true);
      } else {
        toast.error("Failed to submit issue: " + err.message, { id: toastId });
      }
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // PAID HANDLERS
  const openPaidModal = (row) => {
    setActivePaidRow(row);
    setPaidAmount(row.add_amount_by_mm || "");
    setPaidReason(row.reason_for_add_amount || "");
    setIsPaidModalOpen(true);
  };

  const submitPaid = async () => {
    const netFinal = num(activePaidRow.net_final_pay ?? activePaidRow.amount ?? 0);
    const mmAmount = num(paidAmount);

    if (netFinal !== mmAmount && !paidReason.trim()) {
      return toast.error("Reason is required because the Paid amount does not match the Final Pay.");
    }

    setIsSubmittingPaid(true);
    const toastId = toast.loading("Updating payment status...");
    try {
      await api.markPayrollPaid(activePaidRow.id, { 
        add_amount_by_mm: mmAmount,
        reason_for_add_amount: paidReason.trim(),
        date: activePaidRow.date,    // 🔥 Passing for checkClosedBook
        market: activePaidRow.market // 🔥 Passing for checkClosedBook
      });
      toast.success("Payment details saved. Status reset to pending.", { id: toastId });
      setIsPaidModalOpen(false);
      fetchFiltered(); 
    } catch (err) {
      // 🔥 Catch Book Closed Error
      if (err?.message === "Book closed for the month. Contact admin." || err?.error === "BOOK_CLOSED") {
        toast.dismiss(toastId);
        setIsPaidModalOpen(false);
        setShowClosedPopup(true);
      } else {
        toast.error("Failed to update payment: " + err.message, { id: toastId });
      }
    } finally {
      setIsSubmittingPaid(false);
    }
  };

  const handleExport = () => {
    const header = [
      "Date", "Market", "Store", "Employee", "Pay Type", 
      "Total Days", "Total Hrs", "Gross Pay", "Net Pay", "Final Pay", 
      "MM Paid Amt", "MM Reason", "Payment Status", "Status", "Audit Status"
    ];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push([
        toISO(r.date),
        (r.market ?? "").replaceAll(",", " "),
        (r.store ?? "").replaceAll(",", " "),
        (r.employee_name ?? "").replaceAll(",", " "),
        r.pay_type || "-",
        r.total_days_worked || 0,
        r.total_hours || 0,
        r.gross_pay || 0,
        r.net_pay || 0,
        num(r.net_final_pay !== undefined ? r.net_final_pay : r.amount ?? 0),
        r.add_amount_by_mm || 0,
        (r.reason_for_add_amount ?? "").replaceAll(",", " "),
        r.payment_status || "pending",
        r.status || "pending",
        r.audit_status || "pending"
      ].join(","));
    });
    downloadCSV(`payroll-history-page-${currentPage}.csv`, lines.join("\n"));
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
      
      {/* ISSUE MODAL OVERLAY */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Report Issue / Update Notes
            </h3>
            <p className="text-xs text-slate-500 mb-4">Submitting this will reset the approval and audit status to <strong>Pending</strong>.</p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
              rows="4" placeholder="Enter the issue details or updated notes..."
              value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsIssueModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold">Cancel</button>
              <button onClick={submitIssue} disabled={isSubmittingIssue} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50">
                {isSubmittingIssue ? "Submitting..." : "Submit Issue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAID MODAL OVERLAY */}
      {isPaidModalOpen && activePaidRow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Submit Payment Details
            </h3>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Calculated Final Pay</p>
              <p className="text-lg font-mono font-extrabold text-indigo-700">${fmt2(activePaidRow.net_final_pay ?? activePaidRow.amount)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">MM Paid Amount *</label>
                <input 
                  type="number" 
                  step="any"
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold text-slate-800"
                  placeholder="e.g. 1200.50"
                  value={paidAmount} 
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Reason 
                  {num(paidAmount) !== num(activePaidRow.net_final_pay ?? activePaidRow.amount) && <span className="text-rose-500 ml-1">(Required)</span>}
                </label>
                <textarea
                  className={`w-full border rounded-lg p-3 text-sm outline-none ${num(paidAmount) !== num(activePaidRow.net_final_pay ?? activePaidRow.amount) && !paidReason.trim() ? "border-rose-400 bg-rose-50 focus:ring-2 focus:ring-rose-500" : "border-slate-300 focus:ring-2 focus:ring-emerald-500"}`}
                  rows="3" 
                  placeholder={num(paidAmount) !== num(activePaidRow.net_final_pay ?? activePaidRow.amount) ? "Why is the paid amount different from Final Pay?" : "Optional notes..."}
                  value={paidReason} 
                  onChange={(e) => setPaidReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
              <button onClick={() => setIsPaidModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold">Cancel</button>
              <button onClick={submitPaid} disabled={isSubmittingPaid} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50">
                {isSubmittingPaid ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR WITH SEARCH */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
          <div className="relative w-full sm:max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search by Emp Name, ID, or Notes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button onClick={handleExport} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap">
            Export Page CSV
          </button>
        </div>

        {/* GRIDS */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 items-end">
          <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Market</label><input type="text" value={fMarket || "All"} className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50" disabled /></div>
          <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Store</label><select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" value={fStore} onChange={(e) => setFStore(e.target.value)}><option value="">All Stores</option>{availableStores.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Year</label><select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" value={year} onChange={(e) => setYear(Number(e.target.value))}>{yearOptions.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Month</label>
              <SpecificDayFilter 
                availableDates={availableDatesInMonth}
                selectedDates={selectedSpecificDates}
                onChange={setSelectedSpecificDates}
              />
            </div>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {monthOptions.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </div>

          <div className="lg:col-span-2"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Date Period</label><select className="border border-indigo-300 bg-indigo-50 rounded-md px-3 py-2 text-sm w-full font-medium text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={selectedDatePeriod} onChange={(e) => setSelectedDatePeriod(e.target.value)}><option value="all">All Date Periods</option>{availableDatePeriods.map(dp => <option key={dp} value={dp}>{dp}</option>)}</select></div>
          
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Payment</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="lg:col-span-1"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label><select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
          <div className="lg:col-span-1"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Audit Status</label><select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)}><option value="pending">Pending</option><option value="audited">Audited</option><option value="all">All</option></select></div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize">Payroll History</h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{rows.length} records shown</span>
          </div>
          <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full shadow-sm">
            Filtered Grand Total: ${fmt2(grandTotal)}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                {/* 🔒 LOCKED COLUMNS */}
                <th className="w-[80px] min-w-[80px] max-w-[80px] px-2 py-3 sticky left-0 bg-slate-50 z-30 text-center">Action</th>
                <th className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-3 sticky left-[80px] bg-slate-50 z-30 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Employee</th>
                
                {/* 📝 INFO */}
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Market/Store</th>
                <th className="px-3 py-3">Period</th>
                <th className="px-3 py-3">Pay Details</th>
                
                {/* ⏱️ TIME EXCEL GRIDS */}
                <th className="p-0 border-l-2 border-slate-200 bg-fuchsia-50/50 min-w-[120px]">
                  <div className="block border-b border-fuchsia-200 py-1.5 text-center text-[10px] font-extrabold text-fuchsia-900 tracking-wider w-full">WEEK 1</div>
                  <div className="flex w-full divide-x divide-fuchsia-200 text-[9px] text-fuchsia-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1">DAYS</div>
                    <div className="flex-1 py-1">HOURS</div>
                  </div>
                </th>
                
                <th className="p-0 border-l border-slate-200 bg-orange-50/50 min-w-[120px]">
                  <div className="block border-b border-orange-200 py-1.5 text-center text-[10px] font-extrabold text-orange-900 tracking-wider w-full">WEEK 2</div>
                  <div className="flex w-full divide-x divide-orange-200 text-[9px] text-orange-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1">DAYS</div>
                    <div className="flex-1 py-1">HOURS</div>
                  </div>
                </th>
                
                <th className="p-0 border-l-2 border-slate-200 bg-yellow-50/50 min-w-[180px]">
                  <div className="block border-b border-yellow-200 py-1.5 text-center text-[10px] font-extrabold text-yellow-900 tracking-wider w-full">TOTALS</div>
                  <div className="flex w-full divide-x divide-yellow-200 text-[9px] text-yellow-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1">ADJ (D/H)</div>
                    <div className="flex-1 py-1">DAYS</div>
                    <div className="flex-1 py-1">HOURS</div>
                  </div>
                </th>

                {/* 💸 MODIFIER GRIDS */}
                <th className="p-0 border-l-2 border-slate-200 bg-emerald-50/50 min-w-[160px]">
                  <div className="block border-b border-emerald-200 py-1.5 text-center text-[10px] font-extrabold text-emerald-900 tracking-wider w-full">ADDITIONS (+)</div>
                  <div className="flex w-full divide-x divide-emerald-200 text-[9px] text-emerald-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1 w-20">CREDITS</div>
                    <div className="flex-1 py-1 w-20">REIMB</div>
                  </div>
                </th>
                <th className="p-0 border-l border-slate-200 bg-rose-50/50 min-w-[200px]">
                  <div className="block border-b border-rose-200 py-1.5 text-center text-[10px] font-extrabold text-rose-900 tracking-wider w-full">DEDUCTIONS (-)</div>
                  <div className="flex w-full divide-x divide-rose-200 text-[9px] text-rose-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1">LOP</div>
                    <div className="flex-1 py-1">DEDUCTIONS</div>
                    <div className="flex-1 py-1">ADVANCES</div>
                  </div>
                </th>

                {/* 💰 PAY SUMMARY GRID */}
                <th className="p-0 border-l-2 border-slate-200 bg-indigo-50/50 min-w-[220px]">
                  <div className="block border-b border-indigo-200 py-1.5 text-center text-[10px] font-extrabold text-indigo-900 tracking-wider w-full">PAY SUMMARY ($)</div>
                  <div className="flex w-full divide-x divide-indigo-200 text-[9px] text-indigo-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1">GROSS PAY</div>
                    <div className="flex-1 py-1">NET PAY</div>
                    <div className="flex-1 py-1 bg-indigo-100 text-indigo-900">FINAL PAY</div>
                  </div>
                </th>

                {/* PAID BY MM SECTION */}
                <th className="p-0 border-l-2 border-slate-200 bg-sky-50/50 min-w-[200px]">
                  <div className="block border-b border-sky-200 py-1.5 text-center text-[10px] font-extrabold text-sky-900 tracking-wider w-full">PAID BY MM</div>
                  <div className="flex w-full divide-x divide-sky-200 text-[9px] text-sky-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1 w-24">MM AMOUNT</div>
                    <div className="flex-1 py-1 w-32">MM REASON</div>
                  </div>
                </th>

                <th className="px-3 py-3 border-l-2 border-slate-200">Details / Notes</th>
                
                {/* PAYMENT STATUS COLUMN */}
                <th className="px-3 py-3 text-center">Payment Status</th>
                <th className="px-3 py-3 text-center">Status / Audit</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan="16" className="py-8 text-center text-slate-500 font-medium">Loading records...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="16" className="py-8 text-center text-slate-500 font-medium">No data found</td></tr>
              ) : (
                rows.map((r, i) => {
                  const finalNum = num(r.net_final_pay ?? r.amount ?? 0);

                  return (
                    <tr key={r.id || i} className="hover:bg-blue-50 transition-colors group h-12">
                      
                      {/* DUAL ACTION BUTTONS: ISSUE & PAID (ONLY SHOW IF NOT PAID) */}
                      <td className="w-[80px] min-w-[80px] max-w-[80px] px-2 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 text-center">
                        <div className="flex flex-row items-center justify-center gap-1.5 w-full mx-auto">
                          <button onClick={() => openIssueModal(r)} title="Report Issue" className="text-amber-500 bg-amber-50 rounded p-1.5 hover:bg-amber-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </button>

                          {/* 🛡️ CONDITION: ONLY RENDER IF STATUS IS NOT PAID */}
                          {r.payment_status !== 'paid' && (
                            <button onClick={() => openPaidModal(r)} title="Mark as Paid" className="text-emerald-600 bg-emerald-50 rounded p-1.5 hover:bg-emerald-100 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                      
                      <td className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-2 sticky left-[80px] bg-white group-hover:bg-blue-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="font-semibold text-slate-800 truncate">{r.employee_name || "-"}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{r.employee_id || "-"}</div>
                      </td>
                      
                      <td className="px-3 py-2 font-medium text-slate-700">{toISO(r.date)}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">{r.store ?? "-"}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.market ?? "-"}</div>
                      </td>
                      <td className="px-3 py-2 font-bold text-indigo-700 bg-indigo-50/10 whitespace-nowrap">{r.date_period || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="capitalize font-medium text-slate-600">{r.pay_type || "-"}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {r.pay_type === 'salaried' ? `Sal: $${fmt2(num(r.salary_hike) > 0 ? r.salary_hike : r.salary)}` : `Rate: $${fmt2(num(r.pay_rate_hike) > 0 ? r.pay_rate_hike : r.pay_rate)}`}
                        </div>
                      </td>
                      
                      {/* TIME */}
                      <td className="p-0 border-l-2 border-slate-100 bg-fuchsia-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-fuchsia-100/50 min-h-[3rem] text-[11px] font-mono">
                          <div className="flex-1 flex items-center justify-center p-1">{fmt2(r.working_days_1)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">{fmt2(r.hours_worked_1)}</div>
                        </div>
                      </td>
                      <td className="p-0 border-l border-slate-100 bg-orange-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-orange-100/50 min-h-[3rem] text-[11px] font-mono">
                          <div className="flex-1 flex items-center justify-center p-1">{fmt2(r.working_days_2)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">{fmt2(r.hours_worked_2)}</div>
                        </div>
                      </td>
                      <td className="p-0 border-l-2 border-slate-100 bg-yellow-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-yellow-100/50 min-h-[3rem] text-[11px] font-mono text-slate-700">
                          <div className="flex-1 flex flex-col items-center justify-center p-1 text-[9px] leading-tight">
                            <span>{fmt2(r.days_adjusted)}d</span>
                            <span>{fmt2(r.hours_adjusted)}h</span>
                          </div>
                          <div className="flex-1 flex items-center justify-center p-1 font-bold">{fmt2(r.total_days_worked)}</div>
                          <div className="flex-1 flex items-center justify-center p-1 font-bold">{fmt2(r.total_hours)}</div>
                        </div>
                      </td>

                      {/* ADDITIONS */}
                      <td className="p-0 border-l-2 border-slate-100 bg-emerald-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-emerald-100/50 min-h-[3rem] text-[11px] text-emerald-700">
                          <div className="flex-1 flex items-center justify-center p-1 font-mono w-20">{fmt2(r.credits)}</div>
                          <div className="flex-1 flex items-center justify-center p-1 font-mono w-20">{fmt2(r.reimbursements)}</div>
                        </div>
                      </td>

                      {/* DEDUCTIONS */}
                      <td className="p-0 border-l border-slate-100 bg-rose-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-rose-100/50 min-h-[3rem] text-[11px] font-mono text-rose-700">
                          <div className="flex-1 flex items-center justify-center p-1">{fmt2(r.lop_count)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">{fmt2(r.deductions)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">{fmt2(r.loans_advances)}</div>
                        </div>
                      </td>
                      
                      {/* PAY SUMMARY */}
                      <td className="p-0 border-l-2 border-slate-100 bg-indigo-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-indigo-100/50 min-h-[3rem] text-[11px] font-mono">
                          <div className="flex-1 flex items-center justify-center p-1 font-bold text-slate-700">${fmt2(r.gross_pay)}</div>
                          <div className="flex-1 flex items-center justify-center p-1 font-bold text-indigo-700">${fmt2(r.net_pay)}</div>
                          <div className={`flex-1 flex items-center justify-center p-1 font-extrabold bg-indigo-50/50 ${finalNum < 0 ? 'text-rose-600' : 'text-indigo-900'}`}>${fmt2(finalNum)}</div>
                        </div>
                      </td>

                      {/* PAID BY MM */}
                      <td className="p-0 border-l-2 border-slate-100 bg-sky-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-sky-100/50 min-h-[3rem] text-[11px] text-sky-800">
                          <div className="flex-1 flex items-center justify-center p-1 font-mono font-bold w-24">
                            {r.add_amount_by_mm ? `$${fmt2(r.add_amount_by_mm)}` : "-"}
                          </div>
                          <div className="flex-1 flex items-center justify-center p-1 text-[9px] leading-tight text-center break-words w-32">
                            <TruncatedTooltip text={r.reason_for_add_amount} maxWidth="max-w-[120px]" placeholder="-" />
                          </div>
                        </div>
                      </td>
                      
                      {/* NOTES & REASON */}
                      <td className="px-3 py-2 border-l-2 border-slate-100">
                        <div className="flex flex-col gap-1 text-[10px]">
                          {r.employee_stats && r.employee_stats !== 'None (Default)' && r.employee_stats !== 'Standard (Default)' && (
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded w-max font-medium">{r.employee_stats}</span>
                          )}
                          <TruncatedTooltip text={r.notes} maxWidth="max-w-[140px]" placeholder="No Notes" />
                        </div>
                      </td>

                      {/* PAYMENT STATUS */}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.payment_status || "pending"}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col gap-1.5 items-center justify-center w-full max-w-[140px]">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                            {r.status || "pending"}
                          </span>
                          <TruncatedTooltip text={r.reason} maxWidth="max-w-[140px]" placeholder="No reject reason" />
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${r.audit_status === 'audited' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                            {r.audit_status === 'audited' ? 'Audited' : 'Audit Pending'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/30 border-t border-indigo-100">
                <td colSpan="11" className="px-3 py-3 text-right font-extrabold text-indigo-900 uppercase tracking-widest">Filtered Grand Total:</td>
                <td className="p-0 bg-indigo-100/50">
                  <div className="flex w-full h-full divide-x divide-indigo-200/50 min-h-[3rem] text-[12px]">
                    <div className="flex-1"></div>
                    <div className="flex-1"></div>
                    <div className="flex-1 flex items-center justify-center p-1 font-extrabold text-indigo-900 font-mono tracking-tight">${fmt2(grandTotal)}</div>
                  </div>
                </td>
                <td colSpan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4">
          <span className="text-xs font-bold text-slate-500">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={handlePrevPage} disabled={currentPage === 1} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors">Prev</button>
            <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors">Next</button>
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