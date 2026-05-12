
// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { useForm, FormProvider } from "react-hook-form";
// import toast from "react-hot-toast"; 
// import { useGlobalState } from "../context/GlobalStateContext.jsx";
// import { useAuth } from "../context/AuthContext.jsx"; 
// import api from "../services/api.js";
// import { todayCST, num, fmt, toISO } from "../utils/utils.js";

// import { calculateCommissionTotals } from "../utils/commissionCalculator.js"; 
// import CommissionForm from "../components/CommissionForm.jsx";

// const ROWS_PER_PAGE = 20;

// export default function CommissionEntryPage() {
//   const { selectedMarket, selectedStore } = useGlobalState();
//   const { user } = useAuth();
  
//   const [rows, setRows] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pageTotal, setPageTotal] = useState(0); 
//   const [grandTotal, setGrandTotal] = useState(0); 
//   const [availableStores, setAvailableStores] = useState([]);
//   const [isLoadingHistory, setIsLoadingHistory] = useState(false);

//   const methods = useForm({
//     defaultValues: {
//       date: todayCST(),
//       date_period_start: "", 
//       date_period_end: "",   
//       store: selectedStore || "",
//       employee_id: "", employee_name: "", 
      
//       activation_count: "", act_comm: "", upgrade_count: "", upg_comm: "",
//       hint_sold: "", qualified_box: "",
//       vas_mrc: "", vas_avg: "", acc_profit: "", acc_tier: "Tier 0", acc_commission: "",
      
//       retention_35: "", retention_65: "", retention_95: "", retention_125: "",
//       retention_155: "", retention_185: "", retention_215: "", retention_245: "",
//       retention_275: "", retention_305: "", retention_335: "", retention_365: "",
      
//       leasing_done: "", his_spiff: "",
      
//       csat_score: "", rebate_chargeback: "", deposit_chargeback: "", 
//       inventory_variance_chargeback: "", late_clock_in_chargeback: "",
//       write_ups: "", reimbursements: "",
//       entry_reason: "", notes: ""
//     },
//     mode: "onChange"
//   });

//   const { handleSubmit, watch, reset, setValue, formState: { isSubmitting } } = methods;
//   const formValues = watch();
//   const calculations = useMemo(() => calculateCommissionTotals(formValues), [formValues]);

//   useEffect(() => {
//     if (selectedMarket) {
//       api.getStores(selectedMarket).then((data) => {
//         setAvailableStores((data || []).map((s) => (typeof s === "object" ? s.code || s.name : s)).filter(Boolean).sort());
//       }).catch(err => console.error("Failed to fetch stores", err));
//     } else {
//       setAvailableStores([]);
//     }
//   }, [selectedMarket]);

//   useEffect(() => { 
//     setValue("store", selectedStore || ""); 
//   }, [selectedStore, setValue]);

//   const loadRowsForDate = useCallback(async () => {
//     if (!formValues.date) return;
//     setIsLoadingHistory(true);
//     try {
//       const response = await api.getCommissions({ 
//         date: formValues.date, 
//         market: selectedMarket || undefined, 
//         store: selectedStore || undefined, 
//         page: currentPage,
//         limit: ROWS_PER_PAGE
//       });

//       const dataRows = response.data || [];
//       setRows(dataRows);
//       setTotalPages(response.pagination?.totalPages || 1);
//       setGrandTotal(response.summary?.totals?.final_commission || 0);

//       let pt = 0;
//       dataRows.forEach(r => pt += num(r.final_commission));
//       setPageTotal(pt);
//     } catch (err) {
//       console.error("Failed to load commission history", err);
//       toast.error("Could not load history for this date.");
//     } finally {
//       setIsLoadingHistory(false);
//     }
//   }, [formValues.date, selectedMarket, selectedStore, currentPage]);

//   useEffect(() => { loadRowsForDate(); }, [loadRowsForDate]);

//   const onSubmit = async (data) => {
//     const toastId = toast.loading("Saving commission record...");
//     try {
//       // 🔥 FIX 1: Format Date EXACTLY like Payroll (DD-MM-YYYY)
//       const formatDateDisplay = (dateString) => {
//         if (!dateString) return "";
//         const [y, m, d] = dateString.split("-");
//         return `${d}-${m}-${y}`;
//       };

//       const finalDatePeriod = data.date_period_start && data.date_period_end 
//         ? `${formatDateDisplay(data.date_period_start)} to ${formatDateDisplay(data.date_period_end)}`
//         : formatDateDisplay(data.date_period_start || data.date_period_end);

//       const payload = {
//         ...data, 
//         market: selectedMarket, 
//         store: data.store.trim(), 
//         date_period: finalDatePeriod, // Save formatted string to DB
//         ...calculations 
//       };

//       await api.createCommission(payload);
//       toast.success("Commission record saved successfully!", { id: toastId });

//       // 🔥 FIX 2: DO NOT reset the Date Period fields so they persist for the next employee
//       reset({
//         ...methods.getValues(),
//         employee_id: "", employee_name: "", 
//         activation_count: "", act_comm: "", upgrade_count: "", upg_comm: "",
//         hint_sold: "", hint_comm: "", qualified_box: "", box_comm: "",
//         vas_mrc: "", vas_avg: "", vas_commission: "", acc_profit: "", acc_tier: "Tier 0", acc_commission: "",
//         retention_35: "", retention_65: "", retention_95: "", retention_125: "",
//         retention_155: "", retention_185: "", retention_215: "", retention_245: "",
//         retention_275: "", retention_305: "", retention_335: "", retention_365: "",
//         leasing_done: "", leasing_commission: "", his_spiff: "",
//         csat_score: "", csat_comm_loss: "", rebate_chargeback: "", deposit_chargeback: "", 
//         inventory_variance_chargeback: "", late_clock_in_chargeback: "",
//         entry_reason: "", notes: "" 
//       });
      
//       loadRowsForDate();
//     } catch (err) {
//       console.error(err);
//       toast.error(err.message || "Failed to save commission record.", { id: toastId });
//     }
//   };

//   const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
//   const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

//   return (
//     <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
//       <FormProvider {...methods}>
//         <form onSubmit={handleSubmit(onSubmit)}>
//           <CommissionForm calculations={calculations} availableStores={availableStores} market={selectedMarket} isSaving={isSubmitting} />
//         </form>
//       </FormProvider>

//       <div className="space-y-4">
//         <div className="flex justify-between items-center px-1">
//           <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Entries for {formValues.date}</h3>
//           <div className="flex items-center gap-4">
//              <span className="text-xs font-bold text-slate-500">Day Total: <b className="text-indigo-700">${fmt(grandTotal)}</b></span>
//           </div>
//         </div>

//         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
//           <div className="overflow-x-auto custom-scrollbar">
//             <table className="w-full text-left text-xs whitespace-nowrap">
//               <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
//                 <tr>
//                   <th className="px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r">Employee</th>
//                   <th className="px-3 py-3">Period</th>
//                   <th className="px-3 py-3">Store</th>
//                   <th className="px-3 py-3 text-right">Gross Comm</th>
//                   <th className="px-3 py-3 text-right">Deductions</th>
//                   <th className="px-3 py-3 text-right bg-indigo-50/50 text-indigo-800">Final Comm</th>
//                   <th className="px-3 py-3 text-center">Status</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {isLoadingHistory ? (
//                   <tr><td colSpan="7" className="py-8 text-center text-slate-500">Loading history...</td></tr>
//                 ) : rows.length === 0 ? (
//                   <tr><td colSpan="7" className="py-8 text-center text-slate-500">No entries for this date.</td></tr>
//                 ) : (
//                   rows.map((r) => (
//                     <tr key={r.id} className="hover:bg-blue-50 transition-colors h-12">
//                       <td className="px-3 py-2 sticky left-0 bg-white border-r font-semibold text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
//                         {r.employee_name}
//                       </td>
//                       <td className="px-3 py-2 font-bold text-indigo-700 bg-indigo-50/10 whitespace-nowrap">{r.date_period || "-"}</td>
//                       <td className="px-3 py-2 font-medium text-slate-600">{r.store}</td>
//                       <td className="px-3 py-2 text-right font-mono text-amber-600">${fmt(r.total_commission)}</td>
//                       <td className="px-3 py-2 text-right font-mono text-rose-600">${fmt(num(r.csat_comm_loss) + num(r.rebate_chargeback) + num(r.deposit_chargeback) + num(r.inventory_variance_chargeback) + num(r.late_clock_in_chargeback))}</td>
//                       <td className="px-3 py-2 text-right font-mono font-extrabold text-indigo-700 bg-indigo-50/20">${fmt(r.final_commission)}</td>
//                       <td className="px-3 py-2 text-center">
//                         <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
//                           {r.status || "pending"}
//                         </span>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//               <tfoot>
//                 <tr className="bg-slate-50 border-t border-slate-200">
//                   <td colSpan="5" className="px-3 py-3 text-right font-bold text-slate-600 uppercase tracking-widest">Page Total:</td>
//                   <td className="px-3 py-3 text-right font-bold text-indigo-700 font-mono">${fmt(pageTotal)}</td>
//                   <td></td>
//                 </tr>
//               </tfoot>
//             </table>
//           </div>
//         </div>

//         <div className="flex items-center justify-between pt-2">
//           <span className="text-[11px] font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</span>
//           <div className="flex gap-2">
//             <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoadingHistory} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors">Prev</button>
//             <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0 || isLoadingHistory} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors">Next</button>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import toast from "react-hot-toast"; 
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import { useAuth } from "../context/AuthContext.jsx"; 
import api from "../services/api.js";
import { todayCST, num, fmt, toISO } from "../utils/utils.js";

import { calculateCommissionTotals } from "../utils/commissionCalculator.js"; 
import CommissionForm from "../components/CommissionForm.jsx";
import BookClosedPopup from "../components/BookClosedPopup.jsx"; // 🔥 IMPORTED POPUP

const ROWS_PER_PAGE = 20;

export default function CommissionEntryPage() {
  const { selectedMarket, selectedStore } = useGlobalState();
  const { user } = useAuth();
  
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageTotal, setPageTotal] = useState(0); 
  const [grandTotal, setGrandTotal] = useState(0); 
  const [availableStores, setAvailableStores] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 🔥 ADDED STATE FOR BOOK CLOSED POPUP
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  const methods = useForm({
    defaultValues: {
      date: todayCST(),
      date_period_start: "", 
      date_period_end: "",   
      store: selectedStore || "",
      employee_id: "", employee_name: "", 
      
      activation_count: "", act_comm: "", upgrade_count: "", upg_comm: "",
      hint_sold: "", qualified_box: "",
      vas_mrc: "", vas_avg: "", acc_profit: "", acc_tier: "Tier 0", acc_commission: "",
      
      retention_35: "", retention_65: "", retention_95: "", retention_125: "",
      retention_155: "", retention_185: "", retention_215: "", retention_245: "",
      retention_275: "", retention_305: "", retention_335: "", retention_365: "",
      
      leasing_done: "", his_spiff: "",
      
      csat_score: "", rebate_chargeback: "", deposit_chargeback: "", 
      inventory_variance_chargeback: "", late_clock_in_chargeback: "",
      write_ups: "", reimbursements: "",
      entry_reason: "", notes: ""
    },
    mode: "onChange"
  });

  const { handleSubmit, watch, reset, setValue, formState: { isSubmitting } } = methods;
  const formValues = watch();
  const calculations = useMemo(() => calculateCommissionTotals(formValues), [formValues]);

  useEffect(() => {
    if (selectedMarket) {
      api.getStores(selectedMarket).then((data) => {
        setAvailableStores((data || []).map((s) => (typeof s === "object" ? s.code || s.name : s)).filter(Boolean).sort());
      }).catch(err => console.error("Failed to fetch stores", err));
    } else {
      setAvailableStores([]);
    }
  }, [selectedMarket]);

  useEffect(() => { 
    setValue("store", selectedStore || ""); 
  }, [selectedStore, setValue]);

  const loadRowsForDate = useCallback(async () => {
    if (!formValues.date) return;
    setIsLoadingHistory(true);
    try {
      const response = await api.getCommissions({ 
        date: formValues.date, 
        market: selectedMarket || undefined, 
        store: selectedStore || undefined, 
        page: currentPage,
        limit: ROWS_PER_PAGE
      });

      const dataRows = response.data || [];
      setRows(dataRows);
      setTotalPages(response.pagination?.totalPages || 1);
      setGrandTotal(response.summary?.totals?.final_commission || 0);

      let pt = 0;
      dataRows.forEach(r => pt += num(r.final_commission));
      setPageTotal(pt);
    } catch (err) {
      console.error("Failed to load commission history", err);
      toast.error("Could not load history for this date.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [formValues.date, selectedMarket, selectedStore, currentPage]);

  useEffect(() => { loadRowsForDate(); }, [loadRowsForDate]);

  const onSubmit = async (data) => {
    const toastId = toast.loading("Saving commission record...");
    try {
      // 🔥 FIX 1: Format Date EXACTLY like Payroll (DD-MM-YYYY)
      const formatDateDisplay = (dateString) => {
        if (!dateString) return "";
        const [y, m, d] = dateString.split("-");
        return `${d}-${m}-${y}`;
      };

      const finalDatePeriod = data.date_period_start && data.date_period_end 
        ? `${formatDateDisplay(data.date_period_start)} to ${formatDateDisplay(data.date_period_end)}`
        : formatDateDisplay(data.date_period_start || data.date_period_end);

      const payload = {
        ...data, 
        market: selectedMarket, 
        store: data.store.trim(), 
        date_period: finalDatePeriod, // Save formatted string to DB
        ...calculations 
      };

      await api.createCommission(payload);
      toast.success("Commission record saved successfully!", { id: toastId });

      // 🔥 FIX 2: DO NOT reset the Date Period fields so they persist for the next employee
      reset({
        ...methods.getValues(),
        employee_id: "", employee_name: "", 
        activation_count: "", act_comm: "", upgrade_count: "", upg_comm: "",
        hint_sold: "", hint_comm: "", qualified_box: "", box_comm: "",
        vas_mrc: "", vas_avg: "", vas_commission: "", acc_profit: "", acc_tier: "Tier 0", acc_commission: "",
        retention_35: "", retention_65: "", retention_95: "", retention_125: "",
        retention_155: "", retention_185: "", retention_215: "", retention_245: "",
        retention_275: "", retention_305: "", retention_335: "", retention_365: "",
        leasing_done: "", leasing_commission: "", his_spiff: "",
        csat_score: "", csat_comm_loss: "", rebate_chargeback: "", deposit_chargeback: "", 
        inventory_variance_chargeback: "", late_clock_in_chargeback: "",
        entry_reason: "", notes: "" 
      });
      
      loadRowsForDate();
    } catch (err) {
      console.error(err);
      // 🔥 CATCH BOOK CLOSED ERROR
      if (err?.message === "Book closed for the month. Contact admin." || err?.error === "BOOK_CLOSED") {
        toast.dismiss(toastId);
        setShowClosedPopup(true);
      } else {
        toast.error(err.message || "Failed to save commission record.", { id: toastId });
      }
    }
  };

  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CommissionForm calculations={calculations} availableStores={availableStores} market={selectedMarket} isSaving={isSubmitting} />
        </form>
      </FormProvider>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Entries for {formValues.date}</h3>
          <div className="flex items-center gap-4">
             <span className="text-xs font-bold text-slate-500">Day Total: <b className="text-indigo-700">${fmt(grandTotal)}</b></span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r">Employee</th>
                  <th className="px-3 py-3">Period</th>
                  <th className="px-3 py-3">Store</th>
                  <th className="px-3 py-3 text-right">Gross Comm</th>
                  <th className="px-3 py-3 text-right">Deductions</th>
                  <th className="px-3 py-3 text-right bg-indigo-50/50 text-indigo-800">Final Comm</th>
                  <th className="px-3 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingHistory ? (
                  <tr><td colSpan="7" className="py-8 text-center text-slate-500">Loading history...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan="7" className="py-8 text-center text-slate-500">No entries for this date.</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50 transition-colors h-12">
                      <td className="px-3 py-2 sticky left-0 bg-white border-r font-semibold text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {r.employee_name}
                      </td>
                      <td className="px-3 py-2 font-bold text-indigo-700 bg-indigo-50/10 whitespace-nowrap">{r.date_period || "-"}</td>
                      <td className="px-3 py-2 font-medium text-slate-600">{r.store}</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-600">${fmt(r.total_commission)}</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-600">${fmt(num(r.csat_comm_loss) + num(r.rebate_chargeback) + num(r.deposit_chargeback) + num(r.inventory_variance_chargeback) + num(r.late_clock_in_chargeback))}</td>
                      <td className="px-3 py-2 text-right font-mono font-extrabold text-indigo-700 bg-indigo-50/20">${fmt(r.final_commission)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.status || "pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan="5" className="px-3 py-3 text-right font-bold text-slate-600 uppercase tracking-widest">Page Total:</td>
                  <td className="px-3 py-3 text-right font-bold text-indigo-700 font-mono">${fmt(pageTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoadingHistory} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors">Prev</button>
            <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0 || isLoadingHistory} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors">Next</button>
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