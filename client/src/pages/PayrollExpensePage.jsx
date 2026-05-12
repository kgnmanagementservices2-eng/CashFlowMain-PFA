// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { useForm, FormProvider } from "react-hook-form";
// import toast from "react-hot-toast"; 
// import { useGlobalState } from "../context/GlobalStateContext.jsx";
// import { useAuth } from "../context/AuthContext.jsx"; 
// import api from "../services/api.js";
// import { todayCST, num, fmt2 } from "../utils/utils.js"; // ✅ Added fmt2 to imports

// // 🚀 Extracted Business Logic & UI Components
// import { calculatePayrollTotals } from "../utils/payrollCalculator.js"; 
// import PayrollForm from "../components/PayrollForm.jsx";
// import PayrollHistoryTable from "../components/PayrollHistoryTable.jsx"; 

// const ROWS_PER_PAGE = 20;

// export default function PayrollExpensePage() {
//   const { selectedMarket, selectedStore } = useGlobalState();
//   const { user } = useAuth();
  
//   // 🚀 1. Server-Side Pagination & Totals State
//   const [rows, setRows] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pageTotal, setPageTotal] = useState(0); 
//   const [grandTotal, setGrandTotal] = useState(0); 
//   const [availableStores, setAvailableStores] = useState([]);
//   const [isLoadingHistory, setIsLoadingHistory] = useState(false);

//   // 2. Initialize React Hook Form
//   const methods = useForm({
//     defaultValues: {
//       date: todayCST(),
//       store: selectedStore || "",
//       category: "payroll",
//       notes: "",
//       employee_id: "", employee_name: "", date_period_start: "", date_period_end: "",
//       pay_type: "", pay_rate: "", pay_rate_hike: "",
//       working_days_1: "", hours_worked_1: "", working_days_2: "", hours_worked_2: "",
//       hours_adjusted: "", days_adjusted: "", salary: "", salary_hike: "",
//       total_days_to_work: "", lop_count: "", credits: "", deductions: "",
//       loans_advances: "", reimbursements: "", add_amount_by_mm: "",
//       reason_for_add_amount: "", employee_stats: "", payment_status: "pending",
//     },
//     mode: "onChange"
//   });

//   const { handleSubmit, watch, reset, setValue, formState: { isSubmitting } } = methods;

//   // 3. Watch form values for calculations
//   const formValues = watch();
//   const calculations = useMemo(() => calculatePayrollTotals(formValues), [formValues]);

//   // Load Stores
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

//   // 🚀 4. SERVER-SIDE FETCHING
//   const loadRowsForDate = useCallback(async () => {
//     if (!formValues.date) return;
//     setIsLoadingHistory(true);
//     try {
//       const response = await api.getPayrollExpenses({ 
//         date: formValues.date, 
//         market: selectedMarket || undefined, 
//         store: selectedStore || undefined, 
//         category: "payroll",
//         page: currentPage,
//         limit: ROWS_PER_PAGE
//       });

//       const dataRows = response.data || [];
//       setRows(dataRows);
//       setTotalPages(response.pagination?.totalPages || 1);
//       setGrandTotal(response.summary?.totalAmount || 0);

//       let pt = 0;
//       dataRows.forEach(r => pt += num(r.amount ?? r.amount_numeric ?? 0));
//       setPageTotal(pt);

//     } catch (err) {
//       console.error("Failed to load payroll history", err);
//       toast.error("Could not load history for this date.");
//     } finally {
//       setIsLoadingHistory(false);
//     }
//   }, [formValues.date, selectedMarket, selectedStore, currentPage]);

//   useEffect(() => { loadRowsForDate(); }, [loadRowsForDate]);

//   // 5. Submit Handler
//   const onSubmit = async (data) => {
//     const toastId = toast.loading("Saving payroll record...");
    
//     try {
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
//         date_period: finalDatePeriod,
//         amount: calculations.net_final_pay,
//         ...calculations 
//       };

//       await api.createPayrollExpense(payload);
      
//       toast.success("Payroll record saved successfully!", { id: toastId });

//       reset({
//         ...methods.getValues(),
//         notes: "", employee_id: "", employee_name: "", 
//         date_period_start: "", date_period_end: "", pay_type: "", 
//         pay_rate: "", pay_rate_hike: "", working_days_1: "", hours_worked_1: "", 
//         working_days_2: "", hours_worked_2: "", hours_adjusted: "", days_adjusted: "",
//         salary: "", salary_hike: "", total_days_to_work: "", lop_count: "",
//         credits: "", deductions: "", loans_advances: "", reimbursements: "",
//         add_amount_by_mm: "", reason_for_add_amount: "", employee_stats: "", payment_status: "pending"
//       });
      
//       loadRowsForDate();
//     } catch (err) {
//       console.error(err);
//       toast.error(err.message || "Failed to save payroll record.", { id: toastId });
//     }
//   };

//   const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
//   const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

//   return (
//     <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      
//       <FormProvider {...methods}>
//         <form onSubmit={handleSubmit(onSubmit)}>
//           <PayrollForm 
//             calculations={calculations}
//             availableStores={availableStores}
//             market={selectedMarket}
//             isSaving={isSubmitting}
//           />
//         </form>
//       </FormProvider>

//       <div className="space-y-4">
//         <div className="flex justify-between items-center px-1">
//           <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Entries for {formValues.date}</h3>
//           <div className="flex items-center gap-4">
//              <span className="text-xs font-bold text-slate-500">Day Total: <b className="text-slate-900">${fmt2(grandTotal)}</b></span>
//           </div>
//         </div>

//         <PayrollHistoryTable 
//           rows={rows} 
//           total={pageTotal} 
//           isLoading={isLoadingHistory} 
//         />

//         <div className="flex items-center justify-between pt-2">
//           <span className="text-[11px] font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</span>
//           <div className="flex gap-2">
//             <button type="button" onClick={handlePrevPage} disabled={currentPage === 1 || isLoadingHistory} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors">Prev</button>
//             <button type="button" onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0 || isLoadingHistory} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors">Next</button>
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
import { todayCST, num, fmt2 } from "../utils/utils.js"; 

// 🚀 Extracted Business Logic & UI Components
import { calculatePayrollTotals } from "../utils/payrollCalculator.js"; 
import PayrollForm from "../components/PayrollForm.jsx";
import PayrollHistoryTable from "../components/PayrollHistoryTable.jsx"; 
import BookClosedPopup from "../components/BookClosedPopup.jsx"; // 🔥 IMPORTED POPUP

const ROWS_PER_PAGE = 20;

export default function PayrollExpensePage() {
  const { selectedMarket, selectedStore } = useGlobalState();
  const { user } = useAuth();
  
  // 🚀 1. Server-Side Pagination & Totals State
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageTotal, setPageTotal] = useState(0); 
  const [grandTotal, setGrandTotal] = useState(0); 
  const [availableStores, setAvailableStores] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 🔥 ADDED STATE FOR BOOK CLOSED POPUP
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  // 2. Initialize React Hook Form
  const methods = useForm({
    defaultValues: {
      date: todayCST(),
      store: selectedStore || "",
      category: "payroll",
      notes: "",
      employee_id: "", employee_name: "", date_period_start: "", date_period_end: "",
      pay_type: "", pay_rate: "", pay_rate_hike: "",
      working_days_1: "", hours_worked_1: "", working_days_2: "", hours_worked_2: "",
      hours_adjusted: "", days_adjusted: "", salary: "", salary_hike: "",
      total_days_to_work: "", lop_count: "", credits: "", deductions: "",
      loans_advances: "", reimbursements: "", add_amount_by_mm: "",
      reason_for_add_amount: "", employee_stats: "", payment_status: "pending",
    },
    mode: "onChange"
  });

  const { handleSubmit, watch, reset, setValue, formState: { isSubmitting } } = methods;

  // 3. Watch form values for calculations
  const formValues = watch();
  const calculations = useMemo(() => calculatePayrollTotals(formValues), [formValues]);

  // Load Stores
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

  // 🚀 4. SERVER-SIDE FETCHING
  const loadRowsForDate = useCallback(async () => {
    if (!formValues.date) return;
    setIsLoadingHistory(true);
    try {
      const response = await api.getPayrollExpenses({ 
        date: formValues.date, 
        market: selectedMarket || undefined, 
        store: selectedStore || undefined, 
        category: "payroll",
        page: currentPage,
        limit: ROWS_PER_PAGE
      });

      const dataRows = response.data || [];
      setRows(dataRows);
      setTotalPages(response.pagination?.totalPages || 1);
      setGrandTotal(response.summary?.totalAmount || 0);

      let pt = 0;
      dataRows.forEach(r => pt += num(r.amount ?? r.amount_numeric ?? 0));
      setPageTotal(pt);

    } catch (err) {
      console.error("Failed to load payroll history", err);
      toast.error("Could not load history for this date.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [formValues.date, selectedMarket, selectedStore, currentPage]);

  useEffect(() => { loadRowsForDate(); }, [loadRowsForDate]);

  // 5. Submit Handler
  const onSubmit = async (data) => {
    const toastId = toast.loading("Saving payroll record...");
    
    try {
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
        date_period: finalDatePeriod,
        amount: calculations.net_final_pay,
        ...calculations 
      };

      await api.createPayrollExpense(payload);
      
      toast.success("Payroll record saved successfully!", { id: toastId });

      reset({
        ...methods.getValues(),
        notes: "", employee_id: "", employee_name: "", 
        date_period_start: "", date_period_end: "", pay_type: "", 
        pay_rate: "", pay_rate_hike: "", working_days_1: "", hours_worked_1: "", 
        working_days_2: "", hours_worked_2: "", hours_adjusted: "", days_adjusted: "",
        salary: "", salary_hike: "", total_days_to_work: "", lop_count: "",
        credits: "", deductions: "", loans_advances: "", reimbursements: "",
        add_amount_by_mm: "", reason_for_add_amount: "", employee_stats: "", payment_status: "pending"
      });
      
      loadRowsForDate();
    } catch (err) {
      console.error(err);
      // 🔥 CATCH BOOK CLOSED ERROR
      if (err?.message === "Book closed for the month. Contact admin." || err?.error === "BOOK_CLOSED") {
        toast.dismiss(toastId);
        setShowClosedPopup(true);
      } else {
        toast.error(err?.message || "Failed to save payroll record.", { id: toastId });
      }
    }
  };

  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <PayrollForm 
            calculations={calculations}
            availableStores={availableStores}
            market={selectedMarket}
            isSaving={isSubmitting}
          />
        </form>
      </FormProvider>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Entries for {formValues.date}</h3>
          <div className="flex items-center gap-4">
             <span className="text-xs font-bold text-slate-500">Day Total: <b className="text-slate-900">${fmt2(grandTotal)}</b></span>
          </div>
        </div>

        <PayrollHistoryTable 
          rows={rows} 
          total={pageTotal} 
          isLoading={isLoadingHistory} 
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" onClick={handlePrevPage} disabled={currentPage === 1 || isLoadingHistory} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors">Prev</button>
            <button type="button" onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0 || isLoadingHistory} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors">Next</button>
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