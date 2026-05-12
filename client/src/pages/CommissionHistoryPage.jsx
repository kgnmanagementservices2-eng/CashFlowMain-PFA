import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import toast from "react-hot-toast";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
// 🔥 Switched import from fmt to fmt2 for 2-decimal precision!
import { fmt2, num, toISO, downloadCSV } from "../utils/utils.js";

// Components & Utils
import SpecificDayFilter from "../components/SpecificDayFilter.jsx";
import TruncatedTooltip from "../components/TruncatedTooltip.jsx";
import CommissionForm from "../components/CommissionForm.jsx";
import BookClosedPopup from "../components/BookClosedPopup.jsx"; 
import { calculateCommissionTotals } from "../utils/commissionCalculator.js";

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

export default function CommissionHistoryPage() {
  const { selectedMarket, selectedStore } = useGlobalState();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  // 🚀 1. Server-Side Pagination & Totals State
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageTotal, setPageTotal] = useState(0);     
  const [grandTotal, setGrandTotal] = useState(0);   
  const [isLoading, setIsLoading] = useState(false);

  // --- 2. Filter State ---
  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);
  
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [auditFilter, setAuditFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all"); 
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);

  const [selectedDatePeriod, setSelectedDatePeriod] = useState("all");
  const [availableDatePeriods, setAvailableDatePeriods] = useState([]);

  // --- 3. Modals State ---
  
  // ISSUE MODAL
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

  // VIEW MODAL (React Hook Form - Read Only)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // 🔥 ADDED STATE FOR BOOK CLOSED POPUP
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  const viewMethods = useForm({
    defaultValues: {}, 
    mode: "onChange"
  });
  
  const { reset, watch } = viewMethods;
  const viewFormValues = watch();
  const viewCalculations = useMemo(() => calculateCommissionTotals(viewFormValues), [viewFormValues]);

  // Auto-clear selected dates when the Month or Year changes
  useEffect(() => { setSelectedSpecificDates([]); }, [month, year]);

  useEffect(() => {
    if (selectedMarket) {
      api.getStores(selectedMarket).then((data) => {
        setAvailableStores((data || []).map(s => typeof s === "object" ? s.code || s.name : s).filter(Boolean).sort());
      }).catch(console.error);
    } else {
      setAvailableStores([]);
    }
  }, [selectedMarket]);

  useEffect(() => { setFStore(selectedStore || ""); }, [selectedStore]);

  // Pagination Reset 
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedMarket, fStore, statusFilter, auditFilter, paymentStatusFilter,
    year, month, searchTerm, selectedSpecificDates,
    selectedDatePeriod
  ]);

  const { fromDate, toDate } = useMemo(() => {
    const lastDay = daysInMonth(year, month);
    return { fromDate: `${year}-${pad2(month)}-01`, toDate: `${year}-${pad2(month)}-${pad2(lastDay)}` };
  }, [year, month]);

  // 🚀 4. SERVER-SIDE FETCHING
  const loadData = useCallback(async () => {
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

      const response = await api.getCommissions({
        market: selectedMarket || undefined,
        store: fStore || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        audit_status: auditFilter === "all" ? undefined : auditFilter,
        payment_status: paymentStatusFilter === "all" ? undefined : paymentStatusFilter, 
        date: queryDate,
        date_from: queryDateFrom,
        date_to: queryDateTo,
        specific_dates: querySpecificDates,
        date_period: selectedDatePeriod === "all" ? undefined : selectedDatePeriod,
        search: searchTerm || undefined,
        page: currentPage,
        limit: ROWS_PER_PAGE
      });

      const dataRows = response.data || [];
      setRows(dataRows);
      setTotalPages(response.pagination?.totalPages || 1);
      setGrandTotal(response.summary?.totals?.final_commission || 0);

      if (selectedSpecificDates.length === 0) {
        setAvailableDatesInMonth(response.summary?.availableDates || []);
      }

      if (selectedDatePeriod === "all") {
        setAvailableDatePeriods(
          [...new Set(dataRows.map(r => r.date_period).filter(Boolean))].sort()
        );
      }

      let pt = 0;
      dataRows.forEach(r => pt += num(r.final_commission));
      setPageTotal(pt);

    } catch (err) {
      console.error("Failed to load commission history", err);
      toast.error("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedMarket, fStore, statusFilter, auditFilter, paymentStatusFilter, 
    fromDate, toDate, searchTerm, currentPage, 
    selectedSpecificDates, selectedDatePeriod
  ]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- ACTION HANDLERS ---

  // 1. Report Issue
  const openIssueModal = (row) => {
    setActiveIssueId(row.id);
    setIssueNotes(row.notes || "");
    setIsIssueModalOpen(true);
  };

  const submitIssue = async () => {
    if (!issueNotes.trim()) return toast.error("Notes are required to report an issue.");
    setIsSubmittingIssue(true);
    const toastId = toast.loading("Reporting issue...");
    
    try {
      const row = rows.find(r => r.id === activeIssueId);
      
      await api.issueCommission(activeIssueId, { 
        notes: issueNotes,
        date: row?.date,     
        market: row?.market  
      });
      
      toast.success("Issue reported successfully!", { id: toastId });
      setIsIssueModalOpen(false);
      loadData(); 
    } catch (err) {
      if (err?.message === "Book closed for the month. Contact admin." || err?.error === "BOOK_CLOSED") {
        toast.dismiss(toastId);
        setIsIssueModalOpen(false);
        setShowClosedPopup(true);
      } else {
        toast.error(err.message || "Failed to submit issue", { id: toastId });
      }
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // 2. Mark As Paid
  const openPaidModal = (row) => {
    setActivePaidRow(row);
    setPaidAmount(row.add_amount_by_mm || "");
    setPaidReason(row.reason_for_add_amount || "");
    setIsPaidModalOpen(true);
  };

  const submitPaid = async () => {
    const netFinal = num(activePaidRow.final_commission || 0);
    const mmAmount = num(paidAmount);

    if (netFinal !== mmAmount && !paidReason.trim()) {
      return toast.error("Reason is required because the Paid amount does not match the Final Commission.");
    }

    setIsSubmittingPaid(true);
    const toastId = toast.loading("Updating payment status...");
    try {
      await api.markCommissionPaid(activePaidRow.id, { 
        add_amount_by_mm: mmAmount,
        reason_for_add_amount: paidReason.trim(),
        date: activePaidRow.date,    
        market: activePaidRow.market 
      });
      toast.success("Payment details saved. Status reset to pending.", { id: toastId });
      setIsPaidModalOpen(false);
      loadData(); 
    } catch (err) {
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

  // 3. View Read-Only Form
  const openViewModal = (row) => {
    reset({
      ...row,
      date: row.date ? row.date.split('T')[0] : "",
      entry_reason: row.entry_reason || "" 
    });
    setIsViewModalOpen(true);
  };

  // --- EXPORT ---
  const handleExport = () => {
    const header = [
      "Date", "Period", "Market", "Store", "Employee", 
      "Gross Comm", "Deductions", "Final Comm", "MM Paid Amt", "MM Reason", "Payment Status",
      "Status", "Appr/Rej Reason", "Audit Status", "Entry/Edit Reason"
    ];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const deductions = num(r.csat_comm_loss) + num(r.rebate_chargeback) + num(r.deposit_chargeback) + num(r.inventory_variance_chargeback) + num(r.late_clock_in_chargeback) + num(r.write_ups);
      lines.push([
        toISO(r.date),
        (r.date_period ?? "").replaceAll(",", " "),
        (r.market ?? "").replaceAll(",", " "),
        (r.store ?? "").replaceAll(",", " "),
        (r.employee_name ?? "").replaceAll(",", " "),
        r.total_commission || 0,
        deductions || 0,
        r.final_commission || 0,
        r.add_amount_by_mm || 0,
        (r.reason_for_add_amount ?? "").replaceAll(",", " "),
        r.payment_status || "pending",
        r.status || "pending",
        (r.reason || "").replaceAll(",", " "), 
        r.audit_status || "pending",
        (r.entry_reason || "").replaceAll(",", " ") 
      ].join(","));
    });
    downloadCSV(`commission-history-page-${currentPage}.csv`, lines.join("\n"));
  };

  const handleNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const handlePrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

  const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => curY - 4 + i), [curY]);
  const monthOptions = [ { v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" }, { v: 4, label: "Apr" }, { v: 5, label: "May" }, { v: 6, label: "Jun" }, { v: 7, label: "Jul" }, { v: 8, label: "Aug" }, { v: 9, label: "Sep" }, { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" } ];

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto relative">
      
      {/* ⚠️ REPORT ISSUE MODAL */}
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

      {/* 🔥 PAID MODAL OVERLAY */}
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
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Calculated Final Commission</p>
              <p className="text-lg font-mono font-extrabold text-indigo-700">${fmt2(activePaidRow.final_commission)}</p>
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
                  {num(paidAmount) !== num(activePaidRow.final_commission) && <span className="text-rose-500 ml-1">(Required)</span>}
                </label>
                <textarea
                  className={`w-full border rounded-lg p-3 text-sm outline-none ${num(paidAmount) !== num(activePaidRow.final_commission) && !paidReason.trim() ? "border-rose-400 bg-rose-50 focus:ring-2 focus:ring-rose-500" : "border-slate-300 focus:ring-2 focus:ring-emerald-500"}`}
                  rows="3" 
                  placeholder={num(paidAmount) !== num(activePaidRow.final_commission) ? "Why is the paid amount different from Final Commission?" : "Optional notes..."}
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

      {/* 👁️ VIEW MODAL (READ ONLY) */}
      {isViewModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-auto relative animate-in fade-in zoom-in-95 duration-200 border-t-4 border-indigo-500">
            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors z-20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Read Only View</span>
              <h2 className="text-lg font-bold text-slate-800">Commission Record Details</h2>
            </div>
            <div className="max-h-[75vh] overflow-y-auto custom-scrollbar p-1">
              <FormProvider {...viewMethods}>
                <form>
                  <fieldset disabled={true}>
                    <CommissionForm 
                      calculations={viewCalculations} 
                      availableStores={availableStores} 
                      market={viewFormValues.market} 
                      isSaving={false} 
                    />
                  </fieldset>
                </form>
              </FormProvider>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
              <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar with Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
          <div className="relative w-full sm:max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search by Emp Name, ID, or Store..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button onClick={handleExport} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm">
            Export Page CSV
          </button>
        </div>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 items-end">
          <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Market</label><input type="text" value={selectedMarket || "All"} className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500" disabled /></div>
          <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Store</label><select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" value={fStore} onChange={(e) => setFStore(e.target.value)}><option value="">All Stores</option>{availableStores.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Year</label><select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" value={year} onChange={(e) => setYear(Number(e.target.value))}>{yearOptions.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          
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
              className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {monthOptions.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Date Period</label>
            <select
              className="border border-indigo-300 bg-indigo-50 rounded-md px-3 py-2 text-sm w-full font-medium text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={selectedDatePeriod}
              onChange={(e) => setSelectedDatePeriod(e.target.value)}
            >
              <option value="all">All Date Periods</option>
              {availableDatePeriods.map(dp => (
                <option key={dp} value={dp}>{dp}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Payment</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="lg:col-span-1"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label><select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
          <div className="lg:col-span-1"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Audit Status</label><select className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)}><option value="pending">Pending</option><option value="audited">Audited</option><option value="all">All</option></select></div>

        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize">Commission History</h2>
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
                <th className="w-[110px] min-w-[110px] max-w-[110px] px-2 py-3 sticky left-0 bg-slate-50 z-30">Action</th>
                <th className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-3 sticky left-[110px] bg-slate-50 z-30 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Employee</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Period</th>
                <th className="px-3 py-3 border-r">Market/Store</th>

                {/* --- 1. CORE SALES & ACCESSORIES --- */}
                <th className="p-0 border-r border-slate-200 bg-emerald-50/50 min-w-[1100px]">
                  <div className="block border-b border-emerald-200 py-1.5 text-center text-[10px] font-extrabold text-emerald-900 tracking-wider w-full">CORE SALES & ACCESSORIES</div>
                  <div className="flex w-full divide-x divide-emerald-200 text-[9px] text-emerald-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1">ACT CNT</div>
                    <div className="flex-1 py-1">ACT ($)</div>
                    <div className="flex-1 py-1">UPG CNT</div>
                    <div className="flex-1 py-1">UPG ($)</div>
                    <div className="flex-1 py-1">HNT CNT</div>
                    <div className="flex-1 py-1">HNT ($)</div>
                    <div className="flex-1 py-1">BOX CNT</div>
                    <div className="flex-1 py-1">BOX ($)</div>
                    <div className="flex-1 py-1">VAS MRC</div>
                    <div className="flex-1 py-1">VAS AVG</div>
                    <div className="flex-1 py-1">VAS ($)</div>
                    <div className="flex-1 py-1">ACC PROF</div>
                    <div className="flex-1 py-1">TIER</div>
                    <div className="flex-1 py-1">ACC ($)</div>
                  </div>
                </th>

                {/* --- 2. RETENTIONS & ADDITIONS --- */}
                <th className="p-0 border-r border-slate-200 bg-orange-50/50 min-w-[350px]">
                  <div className="block border-b border-orange-200 py-1.5 text-center text-[10px] font-extrabold text-orange-900 tracking-wider w-full">RETENTIONS & ADDITIONS</div>
                  <div className="flex w-full divide-x divide-orange-200 text-[9px] text-orange-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1">RET ($)</div>
                    <div className="flex-1 py-1">LSE CNT</div>
                    <div className="flex-1 py-1">LSE ($)</div>
                    <div className="flex-1 py-1">HIS SPIF</div>
                  </div>
                </th>

                {/* --- 3. DEDUCTIONS & CHARGEBACKS --- */}
                <th className="p-0 border-r border-slate-200 bg-rose-50/50 min-w-[500px]">
                  <div className="block border-b border-rose-200 py-1.5 text-center text-[10px] font-extrabold text-rose-900 tracking-wider w-full">DEDUCTIONS & CHARGEBACKS (-)</div>
                  <div className="flex w-full divide-x divide-rose-200 text-[9px] text-rose-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1">CSAT SCR</div>
                    <div className="flex-1 py-1">CSAT ($)</div>
                    <div className="flex-1 py-1">REB CB</div>
                    <div className="flex-1 py-1">DEP CB</div>
                    <div className="flex-1 py-1">INV CB</div>
                    <div className="flex-1 py-1">LATE CB</div>
                    <div className="flex-1 py-1">WRT UPS</div>
                  </div>
                </th>

                {/* --- 4. SUMMARY --- */}
                <th className="p-0 border-r border-slate-200 bg-indigo-50/50 min-w-[280px]">
                  <div className="block border-b border-indigo-200 py-1.5 text-center text-[10px] font-extrabold text-indigo-900 tracking-wider w-full">SUMMARY ($)</div>
                  <div className="flex w-full divide-x divide-indigo-200 text-[9px] text-indigo-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1">GROSS COMM</div>
                    <div className="flex-1 py-1 text-emerald-700">REIMB (+)</div>
                    <div className="flex-1 py-1 bg-indigo-100 text-indigo-900">FINAL COMM</div>
                  </div>
                </th>

                {/* 🔥 PAID BY MM SECTION */}
                <th className="p-0 border-r border-slate-200 bg-sky-50/50 min-w-[200px]">
                  <div className="block border-b border-sky-200 py-1.5 text-center text-[10px] font-extrabold text-sky-900 tracking-wider w-full">PAID BY MM</div>
                  <div className="flex w-full divide-x divide-sky-200 text-[9px] text-sky-700 text-center font-bold tracking-wider">
                    <div className="flex-1 py-1 w-24">MM AMOUNT</div>
                    <div className="flex-1 py-1 w-32">MM REASON</div>
                  </div>
                </th>

                <th className="px-3 py-3 border-l-2 border-slate-200">Notes & Entry Rsn</th>
                <th className="px-3 py-3 text-center">Payment Status</th>
                <th className="px-3 py-3 text-center min-w-[140px]">Status & Appr Rsn</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan="14" className="py-8 text-center text-slate-500 font-medium">Loading records...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="14" className="py-8 text-center text-slate-500 font-medium">No records found</td></tr>
              ) : (
                rows.map((r, index) => {
                  return (
                    <tr key={r.id || index} className="hover:bg-blue-50 transition-colors group h-12">
                      
                      {/* 🔥 VIEW, REPORT ISSUE AND PAID BUTTONS */}
                      <td className="w-[110px] min-w-[110px] max-w-[110px] px-2 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 text-center">
                        <div className="flex flex-row items-center justify-center gap-1.5 w-full mx-auto">
                          
                          {/* View Button */}
                          <button onClick={() => openViewModal(r)} className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded shadow-sm transition-transform hover:scale-105" title="View Record">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {/* Report Issue Button */}
                          <button onClick={() => openIssueModal(r)} className="text-amber-500 bg-amber-50 rounded-full p-1.5 border border-amber-200 hover:scale-110 transition-transform" title="Report Issue">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </button>

                          {/* 🔥 Mark as Paid Button */}
                          {r.payment_status !== 'paid' && (
                            <button onClick={() => openPaidModal(r)} title="Mark as Paid" className="text-emerald-600 bg-emerald-50 rounded p-1.5 hover:bg-emerald-100 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}

                        </div>
                      </td>

                      {/* Employee Info Sticky Left */}
                      <td className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-2 sticky left-[110px] bg-white group-hover:bg-blue-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="font-semibold text-slate-800 truncate">{r.employee_name || "-"}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{r.employee_id || "-"}</div>
                      </td>

                      <td className="px-3 py-2 font-medium text-slate-700">{toISO(r.date)}</td>
                      <td className="px-3 py-2 font-bold text-indigo-700 bg-indigo-50/10 whitespace-nowrap">{r.date_period || "-"}</td>
                      <td className="px-3 py-2 border-r">
                        <div className="font-semibold text-slate-800">{r.store ?? "-"}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.market ?? "-"}</div>
                      </td>

                      {/* --- 1. CORE SALES & ACCESSORIES --- */}
                      <td className="p-0 border-r border-slate-100 bg-emerald-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-emerald-100/50 min-h-[3rem] text-[11px] font-mono text-slate-600">
                          <div className="flex-1 flex items-center justify-center p-1">{r.activation_count || 0}</div>
                          <div className="flex-1 flex items-center justify-center p-1">${fmt2(r.act_comm)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">{r.upgrade_count || 0}</div>
                          <div className="flex-1 flex items-center justify-center p-1">${fmt2(r.upg_comm)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">{r.hint_sold || 0}</div>
                          <div className="flex-1 flex items-center justify-center p-1">${fmt2(r.hint_comm)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">{r.qualified_box || 0}</div>
                          <div className="flex-1 flex items-center justify-center p-1 font-bold text-emerald-700">${fmt2(r.box_comm)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">${fmt2(r.vas_mrc)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">${fmt2(r.vas_avg)}</div>
                          <div className="flex-1 flex items-center justify-center p-1 font-bold text-emerald-700">${fmt2(r.vas_commission)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">${fmt2(r.acc_profit)}</div>
                          <div className="flex-1 flex items-center justify-center p-1 text-[9px] font-sans text-slate-400">{r.acc_tier || "-"}</div>
                          <div className="flex-1 flex items-center justify-center p-1 font-bold text-emerald-700">${fmt2(r.acc_commission)}</div>
                        </div>
                      </td>

                      {/* --- 2. RETENTIONS & ADDITIONS --- */}
                      <td className="p-0 border-r border-slate-100 bg-orange-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-orange-100/50 min-h-[3rem] text-[11px] font-mono text-slate-600">
                          <div className="flex-1 flex items-center justify-center p-1 font-bold text-orange-700">${fmt2(r.retention_commission)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">{r.leasing_done || 0}</div>
                          <div className="flex-1 flex items-center justify-center p-1 font-bold text-orange-700">${fmt2(r.leasing_commission)}</div>
                          <div className="flex-1 flex items-center justify-center p-1 font-bold text-orange-700">${fmt2(r.his_spiff)}</div>
                        </div>
                      </td>

                      {/* --- 3. DEDUCTIONS & CHARGEBACKS --- */}
                      <td className="p-0 border-r border-slate-100 bg-rose-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-rose-100/50 min-h-[3rem] text-[11px] font-mono text-rose-600">
                          <div className="flex-1 flex items-center justify-center p-1 text-slate-700">{r.csat_score || "-"}</div>
                          <div className="flex-1 flex items-center justify-center p-1">-${fmt2(r.csat_comm_loss)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">-${fmt2(r.rebate_chargeback)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">-${fmt2(r.deposit_chargeback)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">-${fmt2(r.inventory_variance_chargeback)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">-${fmt2(r.late_clock_in_chargeback)}</div>
                          <div className="flex-1 flex items-center justify-center p-1">-${fmt2(r.write_ups)}</div>
                        </div>
                      </td>

                      {/* --- 4. SUMMARY --- */}
                      <td className="p-0 border-r border-slate-100 bg-indigo-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-indigo-100/50 min-h-[3rem] text-[11px] font-mono">
                          <div className="flex-1 flex items-center justify-center p-1 font-bold text-amber-600 bg-amber-50/30">${fmt2(r.total_commission)}</div>
                          <div className="flex-1 flex items-center justify-center p-1 font-bold text-emerald-600">+${fmt2(r.reimbursements)}</div>
                          <div className="flex-1 flex items-center justify-center p-1 font-extrabold text-indigo-700 bg-indigo-50/50">${fmt2(r.final_commission)}</div>
                        </div>
                      </td>

                      {/* 🔥 PAID BY MM */}
                      <td className="p-0 border-l border-slate-100 bg-sky-50/10 align-middle">
                        <div className="flex w-full h-full divide-x divide-sky-100/50 min-h-[3rem] text-[11px] text-sky-800">
                          <div className="flex-1 flex items-center justify-center p-1 font-mono font-bold w-24">
                            {r.add_amount_by_mm ? `$${fmt2(r.add_amount_by_mm)}` : "-"}
                          </div>
                          <div className="flex-1 flex items-center justify-center p-1 text-[9px] leading-tight text-center break-words w-32">
                            <TruncatedTooltip text={r.reason_for_add_amount} maxWidth="max-w-[120px]" placeholder="-" />
                          </div>
                        </div>
                      </td>
                      
                      {/* 🔥 NOTES & ENTRY REASON */}
                      <td className="px-3 py-2 border-l-2 border-slate-100">
                        <div className="flex flex-col gap-1 text-[10px]">
                          <TruncatedTooltip text={`Issue : ${r.notes}`} maxWidth="max-w-[140px]" placeholder="No Notes" />
                          {r.entry_reason && (
                            <div className="mt-1 text-indigo-700 font-medium">
                              <TruncatedTooltip text={`Entry Reason : ${r.entry_reason}`} maxWidth="max-w-[140px]" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 🔥 PAYMENT STATUS BADGE */}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.payment_status || "pending"}
                        </span>
                      </td>

                      {/* 🔥 STATUS & APPR REASON */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col gap-1.5 items-center justify-center w-full max-w-[140px]">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                            {r.status || "pending"}
                          </span>
                          
                          {r.reason && (
                            <div className={`text-[10px] font-medium ${r.status === 'rejected' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              <TruncatedTooltip text={`Approval Reason : ${r.reason}`} maxWidth="max-w-[140px]" />
                            </div>
                          )}

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
            
            {/* 🔥 Server-Side Footer Totals */}
            <tfoot>
              <tr className="bg-indigo-50/30 border-t border-indigo-100 uppercase tracking-wider">
                <td className="px-3 py-3 text-right font-bold text-indigo-900 sticky left-0 z-20 bg-indigo-50/30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" colSpan="5">Filtered Grand Total:</td>
                <td colSpan="3"></td>
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
            <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors disabled:opacity-50 hover:bg-slate-300">Prev</button>
            <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0 || isLoading} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors disabled:opacity-50 hover:bg-slate-300">Next</button>
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