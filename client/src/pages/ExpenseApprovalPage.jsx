import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast"; 
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
// 🔥 Switched from fmt to fmt2 for precise 2-decimal formatting!
import { toISO, num, fmt2, downloadCSV } from "../utils/utils.js";
import ApprovalTable from "../components/ApprovalTable.jsx";
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

export default function ExpenseApprovalPage({ navParams }) {
  const { selectedMarket, selectedStore, refreshPendingBadge } = useGlobalState();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  // 🚀 Server-Side Pagination State
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [grandTotal, setGrandTotal] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter State
  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);
  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [auditFilter, setAuditFilter] = useState("pending");

  const [searchTerm, setSearchTerm] = useState("");
  
  // Specific dates and available dates state
  const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);

  // Modal States
  const [actionModal, setActionModal] = useState({ isOpen: false, type: null, id: null, reason: "" });
  const [showClosedPopup, setShowClosedPopup] = useState(false); // 🔥 ADDED STATE FOR BOOK CLOSED POPUP

  useEffect(() => {
    setSelectedSpecificDates([]);
  }, [month, year]);

  useEffect(() => {
    if (selectedMarket) {
      api.getStores(selectedMarket)
        .then((data) => setAvailableStores((data || []).map((s) => (typeof s === "object" ? s.code || s.name : s)).filter(Boolean).sort()))
        .catch(console.error);
    } else setAvailableStores([]);
  }, [selectedMarket]);

  useEffect(() => { setFStore(selectedStore || ""); }, [selectedStore]);

  useEffect(() => {
    if (navParams?.focus === "pending") {
      setStatusFilter("pending");
      setAuditFilter("pending");
    }
  }, [navParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMarket, fStore, statusFilter, auditFilter, year, month, searchTerm, selectedSpecificDates]);

  const { fromDate, toDate } = useMemo(() => {
    const lastDay = daysInMonth(year, month);
    return { fromDate: `${year}-${pad2(month)}-01`, toDate: `${year}-${pad2(month)}-${pad2(lastDay)}` };
  }, [year, month]);

  // 🚀 SERVER-SIDE FETCHING WITH MUTUALLY EXCLUSIVE DATES
  const fetchFiltered = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiStatus = statusFilter === "all" ? undefined : statusFilter;
      const apiAudit = auditFilter === "all" ? undefined : auditFilter;

      // Guarantee Mutually Exclusive Date Parameters
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
        market: selectedMarket || undefined,
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

      // Lock dropdown from shrinking
      if (selectedSpecificDates.length === 0) {
        setAvailableDatesInMonth(response.summary?.availableDates || []);
      }

    } catch (err) {
      console.error("Failed to load approvals", err);
      toast.error("Failed to load approvals.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMarket, fStore, statusFilter, auditFilter, fromDate, toDate, searchTerm, currentPage, selectedSpecificDates]);
  
  useEffect(() => { fetchFiltered(); }, [fetchFiltered]);

  const triggerAction = (id, type) => {
    const row = rows.find(r => r.id === id);
    setActionModal({ isOpen: true, type, id, reason: row?.reason || "" });
  };

  const confirmAction = async () => {
    const { id, type, reason } = actionModal;
    const trimmedReason = reason.trim();

    if (!trimmedReason && type === "reject") return toast.error(`You must provide a reason to reject this expense record.`);

    // 🔥 Find row to pass date and market to backend for Closed Book check
    const row = rows.find(r => r.id === id);
    const rowDate = row?.expense_date || row?.date;
    const rowMarket = row?.market;

    const toastId = toast.loading(`Processing ${type}...`);
    try {
      if (type === "approve") {
        await api.approveExpense(id, trimmedReason, rowDate, rowMarket);
      } else if (type === "reject") {
        await api.rejectExpense(id, trimmedReason, rowDate, rowMarket);
      }
      
      await api.auditExpense(id, rowDate, rowMarket);
      
      toast.success(`Record ${type}d successfully!`, { id: toastId });
      setActionModal({ isOpen: false, type: null, id: null, reason: "" });
      fetchFiltered(); 
      if (refreshPendingBadge) refreshPendingBadge(selectedMarket);
    } catch (err) {
      // 🔥 CATCH BOOK CLOSED ERROR
      if (err?.message === "Book closed for the month. Contact admin." || err?.error === "BOOK_CLOSED") {
        toast.dismiss(toastId);
        setActionModal({ isOpen: false, type: null, id: null, reason: "" });
        setShowClosedPopup(true);
      } else {
        toast.error("Action failed. Please try again.", { id: toastId });
      }
    }
  };

  const handleExport = () => {
    const header = [
      "Date", "Market", "Store", "Manager", "Category", "Amount", 
      "Receipt URL", "Comment", "Status", "Reason", "Audit Status", "Audit By"
    ];
    const lines = [header.join(",")];
    
    rows.forEach((r) => {
      lines.push([
        toISO(r.expense_date || r.date),
        (r.market || "").replaceAll(",", " "),
        (r.store || "").replaceAll(",", " "),
        (r.managername || r.manager_name || "").replaceAll(",", " "),
        (r.category || "").replaceAll(",", " "),
        fmt2(num(r.amount ?? r.amount_numeric)), // 🔥 Updated to fmt2
        r.upload_url || "",
        (r.comment || r.notes || "").replaceAll("\n", " ").replaceAll(",", " "),
        r.status || "pending",
        (r.reason || "").replaceAll(",", " "),
        r.audit_status || "pending",
        r.audit_by || "" 
      ].join(","));
    });
    downloadCSV(`expense_approvals_page_${currentPage}.csv`, lines.join("\n"));
  };

  const columns = [
    { 
      header: "Action", 
      render: (r) => (
        <div className="flex flex-row items-center justify-center gap-1.5 w-[70px] mx-auto">
          {r.status !== 'approved' && (
            <button onClick={() => triggerAction(r.id, "approve")} className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded shadow-sm transition-transform hover:scale-105" title="Approve Record">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {r.status !== 'rejected' && (
            <button onClick={() => triggerAction(r.id, "reject")} className="bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded shadow-sm transition-transform hover:scale-105" title="Reject Record">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )
    },
    { header: "Date", render: (r) => <span className="font-medium text-slate-700">{toISO(r.expense_date || r.date)}</span>, className: "whitespace-nowrap" },
    { header: "Market/Store", render: (r) => (<div><div className="font-semibold text-slate-800">{r.store ?? "-"}</div><div className="text-[10px] text-slate-400 font-mono">{r.market ?? "-"}</div></div>) },
    { header: "Manager", render: (r) => <span className="font-semibold text-slate-800">{r.managername || r.manager_name || "-"}</span> },
    { header: "Category", render: (r) => <span className="capitalize font-medium text-slate-600">{r.category}</span> },
    { header: "Amount", render: (r) => { const amtNum = num(r.amount ?? r.amount_numeric); return <span className={`font-extrabold ${amtNum < 0 ? 'text-rose-600' : 'text-slate-900'}`}>${fmt2(amtNum)}</span>; }, className: "text-right tracking-tight" }, // 🔥 Updated to fmt2
    { header: "Receipt", render: (r) => r.upload_url ? (<a href={r.upload_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline font-medium">View</a>) : "-" },
    { header: "Comment", render: (r) => <TruncatedTooltip text={r.comment || r.notes} maxWidth="max-w-[150px]" /> },
    { header: "Status / Reason", render: (r) => {
        let color = "bg-amber-100 text-amber-700";
        if (r.status === 'approved') color = "bg-emerald-100 text-emerald-700";
        if (r.status === 'rejected') color = "bg-rose-100 text-rose-700";
        return (
          <div className="flex flex-col gap-1.5 items-start">
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color}`}>{r.status || "pending"}</span>
            <TruncatedTooltip text={r.reason} maxWidth="max-w-[140px]" placeholder="No reason" />
          </div>
        );
      }
    },
    { header: "Audit Status", className: "text-center", render: (r) => {
        const isAudited = r.audit_status === 'audited';
        return (
          <div className="flex flex-col items-center gap-1">
             <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isAudited ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
               {isAudited ? `Audited: ${r.audit_by?.split(' ')[0]}` : "Audit Pending"}
             </span>
          </div>
        );
      }
    }
  ];

  const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => curY - 4 + i), [curY]);
  const monthOptions = [
    { v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" }, { v: 4, label: "Apr" },
    { v: 5, label: "May" }, { v: 6, label: "Jun" }, { v: 7, label: "Jul" }, { v: 8, label: "Aug" },
    { v: 9, label: "Sep" }, { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" },
  ];

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto relative">
      
      {/* APPROVAL / REJECTION ACTION MODAL */}
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

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
        
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
          <button onClick={handleExport} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm">
            Export Page CSV
          </button>
        </div>

        {/* Grid Filters */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Market</label>
            <input type="text" value={selectedMarket || "All"} className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500" disabled />
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
              <option value="pending">Pending</option>
              <option value="audited">Audited</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize">Expense Approvals</h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{rows.length} records shown</span>
          </div>
          <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full shadow-sm">
            Grand Total: ${fmt2(grandTotal)} {/* 🔥 Updated to fmt2 */}
          </span>
        </div>
        
        <ApprovalTable 
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onNext: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
            onPrev: () => setCurrentPage(p => Math.max(p - 1, 1))
          }}
        />
      </div>

      {/* --- BOOK CLOSED POPUP --- */}
      <BookClosedPopup 
        isOpen={showClosedPopup} 
        onClose={() => setShowClosedPopup(false)} 
      />

    </section>
  );
}