// import React from "react";
// import { useFormContext } from "react-hook-form";
// import { fmt2 } from "../utils/utils.js";

// export default function PayrollForm({
//   calculations, // The useMemo object from step 2
//   availableStores,
//   market,
//   isSaving,
// }) {
//   // 1. Pull the tools we need from React Hook Form context
//   const { register, watch } = useFormContext();

//   // 2. Watch specific fields to trigger UI changes dynamically
//   const payType = watch("pay_type");
//   const employeeStats = watch("employee_stats");

//   const isPayrate = payType === "payrate";
//   const isSalaried = payType === "salaried";
//   const showTimesheet = isPayrate || isSalaried;
//   const isResigning = employeeStats === "resigning";

//   return (
//     // Changed from <form> to <div> because the parent component now wraps this in a <form>
//     <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 transition-all">
//       <h2 className="text-lg font-bold text-slate-800 mb-6 tracking-tight border-b border-slate-100 pb-3">
//         Add Payroll Record
//       </h2>
      
//       {/* 1. GENERAL & EMPLOYEE INFO */}
//       <div className="grid gap-4 sm:grid-cols-12 mb-6">
//         <div className="sm:col-span-3">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Date *</label>
//           <input type="date" {...register("date", { required: true })} 
//             className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//         </div>
//         <div className="sm:col-span-4">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Market</label>
//           <input type="text" value={market || "All"} disabled
//             className="w-full border border-slate-200 bg-slate-50 rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
//         </div>
//         <div className="sm:col-span-5">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Store *</label>
//           <select {...register("store", { required: true })} 
//             className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
//             <option value="">Select Store...</option>
//             {availableStores.map((s) => <option key={s} value={s}>{s}</option>)}
//           </select>
//         </div>

//         <div className="sm:col-span-3">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Emp ID *</label>
//           <input type="text" {...register("employee_id", { required: true })} placeholder="e.g. CGA4765" 
//             className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//         </div>
//         <div className="sm:col-span-4">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Employee Name *</label>
//           <input type="text" {...register("employee_name", { required: true })} placeholder="Full Name" 
//             className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//         </div>
//         <div className="sm:col-span-5">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Date Period *</label>
//           <div className="flex items-center gap-2">
//             <input type="date" {...register("date_period_start", { required: true })} 
//               className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//             <span className="text-slate-400 font-medium text-sm">to</span>
//             <input type="date" {...register("date_period_end", { required: true })} 
//               className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//           </div>
//         </div>
//       </div>

//       {/* 2. PAY TYPE & CLASSIFICATION */}
//       <div className="grid gap-4 sm:grid-cols-3 mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg">
//         <div>
//           <label className="block text-[11px] uppercase font-bold text-indigo-600 mb-1.5 tracking-wider">Pay Type *</label>
//           <select {...register("pay_type", { required: true })} 
//             className="w-full border border-indigo-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-900 bg-white">
//             <option value="">Select Type</option>
//             <option value="payrate">Payrate (Hourly)</option>
//             <option value="salaried">Salaried</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Employee Stats</label>
//           <select {...register("employee_stats")} 
//             className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
//             <option value="">Standard (Default)</option>
//             <option value="newlyjoined">Newly Joined</option>
//             <option value="resigning">Resigning</option>
//           </select>
//         </div>
//         {isSalaried && (
//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Payment Status</label>
//             <select {...register("payment_status")} 
//               className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
//               <option value="pending">Pending</option>
//               <option value="paid">Paid</option>
//             </select>
//           </div>
//         )}
//       </div>

//       {/* 3. RATES & DYNAMIC INPUTS */}
//       {showTimesheet && (
//         <div className="animate-in fade-in slide-in-from-top-2 duration-300">
//           <div className="grid gap-4 sm:grid-cols-4 mb-6">
//             {isPayrate && (
//               <>
//                 <div>
//                   <label className="block text-[11px] uppercase font-bold text-blue-600 mb-1.5 tracking-wider">Pay Rate ($/hr)</label>
//                   <input type="number" step="0.01" {...register("pay_rate")} placeholder="0.00"
//                     className="w-full border border-blue-200 bg-blue-50 rounded-md px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] uppercase font-bold text-blue-600 mb-1.5 tracking-wider">Pay Rate Hike ($)</label>
//                   <input type="number" step="0.01" {...register("pay_rate_hike")} placeholder="0.00"
//                     className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
//                 </div>
//               </>
//             )}

//             {isSalaried && (
//               <>
//                 <div>
//                   <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">Salary ($)</label>
//                   <input type="number" step="0.01" {...register("salary")} placeholder="0.00"
//                     className="w-full border border-emerald-200 bg-emerald-50 rounded-md px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">Salary Hike ($)</label>
//                   <input type="number" step="0.01" {...register("salary_hike")} placeholder="0.00"
//                     className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">No of Days in Week (To Work)</label>
//                   <input type="number" step="0.5" {...register("total_days_to_work")} placeholder="0"
//                     className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
//                 </div>
//               </>
//             )}
//           </div>

//           {/* TIMESHEET */}
//           <div className="grid gap-4 sm:grid-cols-12 items-end mb-6">
//             <div className="sm:col-span-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
//               <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Week 1</label>
//               <div className="grid grid-cols-2 gap-3">
//                 <div><label className="text-[10px] text-slate-500 block mb-1">Days</label><input type="number" step="0.5" {...register("working_days_1")} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" /></div>
//                 <div><label className="text-[10px] text-slate-500 block mb-1">Hours</label><input type="number" step="0.01" {...register("hours_worked_1")} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" /></div>
//               </div>
//             </div>

//             <div className="sm:col-span-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
//               <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Week 2</label>
//               <div className="grid grid-cols-2 gap-3">
//                 <div><label className="text-[10px] text-slate-500 block mb-1">Days</label><input type="number" step="0.5" {...register("working_days_2")} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" /></div>
//                 <div><label className="text-[10px] text-slate-500 block mb-1">Hours</label><input type="number" step="0.01" {...register("hours_worked_2")} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" /></div>
//               </div>
//             </div>

//             <div className="sm:col-span-2 space-y-3">
//               {isPayrate && (
//                 <div>
//                   <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase text-center">Adj Hrs</label>
//                   <input type="number" step="0.01" {...register("hours_adjusted")} placeholder="0" className="w-full border border-slate-300 rounded-md px-2 py-2 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" />
//                 </div>
//               )}
//               {isSalaried && (
//                 <div>
//                   <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase text-center">Adj Days</label>
//                   <input type="number" step="0.5" {...register("days_adjusted")} placeholder="0" className="w-full border border-slate-300 rounded-md px-2 py-2 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" />
//                 </div>
//               )}
//             </div>

//             <div className="sm:col-span-4 grid grid-cols-2 gap-2 h-[68px]">
//               <div className="bg-yellow-50 rounded-lg flex flex-col items-center justify-center border border-yellow-200 shadow-sm">
//                  <span className="text-[9px] font-bold text-yellow-800 uppercase tracking-wider text-center">Total Days</span>
//                  <span className="text-base font-extrabold text-slate-900 mt-0.5">{fmt2(calculations?.total_days_worked)}</span>
//               </div>
//               <div className="bg-yellow-50 rounded-lg flex flex-col items-center justify-center border border-yellow-200 shadow-sm">
//                  <span className="text-[9px] font-bold text-yellow-800 uppercase tracking-wider text-center">Total Hrs</span>
//                  <span className="text-base font-extrabold text-slate-900 mt-0.5">{fmt2(calculations?.total_hours)}</span>
//               </div>
//             </div>
//           </div>

//           {/* 4. DEDUCTIONS & POST-NET ADJUSTMENTS */}
//           <div className="border-t border-slate-100 pt-5 mb-6">
//             <div className="grid gap-4 sm:grid-cols-4 items-end mb-4">
//               {isSalaried ? (
//                 <>
//                   <div>
//                     <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">LOP Count</label>
//                     {/* Render different inputs depending on if they are resigning to avoid hook conflicts */}
//                     {isResigning ? (
//                       <input type="number" step="0.5" {...register("lop_count")} 
//                         className="w-full border border-indigo-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white" />
//                     ) : (
//                       <input type="number" readOnly value={calculations?.lop_count || 0} 
//                         className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500 outline-none" />
//                     )}
//                   </div>
//                   <div>
//                     <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">Auto Credits ($)</label>
//                     <input type="text" readOnly value={fmt2(calculations?.credits)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500" />
//                   </div>
//                   <div>
//                     <label className="block text-[11px] uppercase font-bold text-rose-600 mb-1.5 tracking-wider">Auto Deductions ($)</label>
//                     <input type="text" readOnly value={fmt2(calculations?.deductions)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500" />
//                   </div>
//                 </>
//               ) : (<div className="sm:col-span-3"></div>)}
//             </div>

//             <div className="grid gap-4 sm:grid-cols-4 mb-6">
//               <div>
//                 <label className="block text-[11px] uppercase font-bold text-rose-600 mb-1.5 tracking-wider">Loans/Advances ($)</label>
//                 <input type="number" step="0.01" {...register("loans_advances")} placeholder="0.00"
//                   className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
//               </div>
//               <div>
//                 <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">Reimbursements ($)</label>
//                 <input type="number" step="0.01" {...register("reimbursements")} placeholder="0.00"
//                   className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
//               </div>
//               {/* 🔥 UPDATED: MM AMOUNT LABEL */}
//               <div>
//                 <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">Final Amount Paid By MM ($)</label>
//                 <input type="number" step="0.01" {...register("add_amount_by_mm")} placeholder="0.00"
//                   className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
//               </div>
//               <div>
//                 <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Reason for MM Amount</label>
//                 <input type="text" {...register("reason_for_add_amount")} placeholder="Brief reason"
//                   className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//               </div>
//             </div>

//             {/* 5. AUTO-CALCULATED RESULTS */}
//             <div className="grid gap-4 sm:grid-cols-3 items-center">
//               <div className="h-full">
//                 <div className="bg-slate-100 text-slate-700 rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-inner border border-slate-200">
//                   <span className="text-[10px] uppercase font-bold tracking-wider">Gross Pay</span>
//                   <span className="text-2xl font-mono font-extrabold">${fmt2(calculations?.gross_pay)}</span>
//                 </div>
//               </div>
//               <div className="h-full">
//                 <div className="bg-[#4a148c] text-white rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-md">
//                   <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">Net Pay</span>
//                   <span className="text-2xl font-mono font-extrabold">${fmt2(calculations?.net_pay)}</span>
//                 </div>
//               </div>
//               <div className="h-full">
//                 <div className="bg-[#d32f2f] text-white rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-lg">
//                   <span className="text-[10px] uppercase font-bold text-red-100 tracking-wider">Net Final Pay</span>
//                   <span className="text-3xl font-mono font-extrabold">${fmt2(calculations?.net_final_pay)}</span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="border-t border-slate-100 pt-5">
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Notes *</label>
//             <input type="text" {...register("notes", { required: true })} placeholder="Description/Notes" 
//               className="w-full border border-slate-300 rounded-md px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" />
//           </div>
//         </div>
//       )}

//       {/* Submit Button */}
//       <div className="mt-6 pt-4 flex flex-col sm:flex-row items-center gap-4">
//         <button type="submit" disabled={!showTimesheet || isSaving}
//           className={`px-8 py-3 w-full sm:w-auto rounded-lg font-bold text-sm shadow transition-all ${
//             showTimesheet ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
//           }`}>
//           {isSaving ? "Saving Record..." : "Save Record"}
//         </button>
//         {!showTimesheet && <span className="text-xs text-rose-500 font-bold">* Please select a Pay Type to continue</span>}
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { fmt2 } from "../utils/utils.js";

export default function PayrollForm({
  calculations, 
  availableStores,
  market,
  isSaving,
}) {
  // 1. Pull the tools we need from React Hook Form context
  const { register, watch, setValue } = useFormContext();

  // 2. Watch specific fields to trigger UI changes dynamically
  const payType = watch("pay_type");
  const employeeStats = watch("employee_stats");

  const isPayrate = payType === "payrate";
  const isSalaried = payType === "salaried";
  const showTimesheet = isPayrate || isSalaried;

  // 3. Watch timesheet fields to auto-calculate the LOP Count
  const totalDaysToWork = watch("total_days_to_work");
  const w1 = watch("working_days_1");
  const w2 = watch("working_days_2");
  const dAdj = watch("days_adjusted");

  // 🔥 Track the previous timesheet state to prevent initial overwrite
  const prevTimesheet = useRef("");

  // 🔥 Auto-calculate LOP and push it to the editable input
  useEffect(() => {
    if (isSalaried) {
      const t = parseFloat(totalDaysToWork) || 0;
      const worked1 = parseFloat(w1) || 0;
      const worked2 = parseFloat(w2) || 0;
      const adj = parseFloat(dAdj) || 0;
      
      const worked = worked1 + worked2 + adj;
      const expectedDays = t * 2;
      const autoLop = worked - expectedDays;

      // Create a unique string signature of the current timesheet inputs
      const currentTimesheet = `${t}-${worked1}-${worked2}-${adj}`;

      // 1. If this is the very first time the form loads data, skip the overwrite!
      if (prevTimesheet.current === "") {
        prevTimesheet.current = currentTimesheet;
        return; 
      }

      // 2. If the user actively changes a timesheet number AFTER loading, run the math!
      if (prevTimesheet.current !== currentTimesheet) {
        setValue("lop_count", autoLop, { shouldDirty: true });
        prevTimesheet.current = currentTimesheet;
      }
    }
  }, [isSalaried, totalDaysToWork, w1, w2, dAdj, setValue]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 transition-all">
      <h2 className="text-lg font-bold text-slate-800 mb-6 tracking-tight border-b border-slate-100 pb-3">
        Add Payroll Record
      </h2>
      
      {/* 1. GENERAL & EMPLOYEE INFO */}
      <div className="grid gap-4 sm:grid-cols-12 mb-6">
        <div className="sm:col-span-3">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Date *</label>
          <input type="date" {...register("date", { required: true })} 
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="sm:col-span-4">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Market</label>
          <input type="text" value={market || "All"} disabled
            className="w-full border border-slate-200 bg-slate-50 rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
        </div>
        <div className="sm:col-span-5">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Store *</label>
          <select {...register("store", { required: true })} 
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
            <option value="">Select Store...</option>
            {availableStores.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Emp ID *</label>
          <input type="text" {...register("employee_id", { required: true })} placeholder="e.g. CGA4765" 
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="sm:col-span-4">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Employee Name *</label>
          <input type="text" {...register("employee_name", { required: true })} placeholder="Full Name" 
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="sm:col-span-5">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Date Period *</label>
          <div className="flex items-center gap-2">
            <input type="date" {...register("date_period_start", { required: true })} 
              className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            <span className="text-slate-400 font-medium text-sm">to</span>
            <input type="date" {...register("date_period_end", { required: true })} 
              className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
      </div>

      {/* 2. PAY TYPE & CLASSIFICATION */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg">
        <div>
          <label className="block text-[11px] uppercase font-bold text-indigo-600 mb-1.5 tracking-wider">Pay Type *</label>
          <select {...register("pay_type", { required: true })} 
            className="w-full border border-indigo-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-900 bg-white">
            <option value="">Select Type</option>
            <option value="payrate">Payrate (Hourly)</option>
            <option value="salaried">Salaried</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Employee Stats</label>
          <select {...register("employee_stats")} 
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
            <option value="">Standard (Default)</option>
            <option value="newlyjoined">Newly Joined</option>
            <option value="resigning">Resigning</option>
          </select>
        </div>
        {isSalaried && (
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Payment Status</label>
            <select {...register("payment_status")} 
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        )}
      </div>

      {/* 3. RATES & DYNAMIC INPUTS */}
      {showTimesheet && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            {isPayrate && (
              <>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-blue-600 mb-1.5 tracking-wider">Pay Rate ($/hr)</label>
                  <input type="number" step="0.01" {...register("pay_rate")} placeholder="0.00"
                    className="w-full border border-blue-200 bg-blue-50 rounded-md px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-blue-600 mb-1.5 tracking-wider">Pay Rate Hike ($)</label>
                  <input type="number" step="0.01" {...register("pay_rate_hike")} placeholder="0.00"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </>
            )}

            {isSalaried && (
              <>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">Salary ($)</label>
                  <input type="number" step="0.01" {...register("salary")} placeholder="0.00"
                    className="w-full border border-emerald-200 bg-emerald-50 rounded-md px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">Salary Hike ($)</label>
                  <input type="number" step="0.01" {...register("salary_hike")} placeholder="0.00"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">No of Days in Week (To Work)</label>
                  <input type="number" step="0.5" {...register("total_days_to_work")} placeholder="0"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </>
            )}
          </div>

          {/* TIMESHEET */}
          <div className="grid gap-4 sm:grid-cols-12 items-end mb-6">
            <div className="sm:col-span-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Week 1</label>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] text-slate-500 block mb-1">Days</label><input type="number" step="0.5" {...register("working_days_1")} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" /></div>
                <div><label className="text-[10px] text-slate-500 block mb-1">Hours</label><input type="number" step="0.01" {...register("hours_worked_1")} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" /></div>
              </div>
            </div>

            <div className="sm:col-span-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Week 2</label>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] text-slate-500 block mb-1">Days</label><input type="number" step="0.5" {...register("working_days_2")} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" /></div>
                <div><label className="text-[10px] text-slate-500 block mb-1">Hours</label><input type="number" step="0.01" {...register("hours_worked_2")} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" /></div>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-3">
              {isPayrate && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase text-center">Adj Hrs</label>
                  <input type="number" step="0.01" {...register("hours_adjusted")} placeholder="0" className="w-full border border-slate-300 rounded-md px-2 py-2 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" />
                </div>
              )}
              {isSalaried && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase text-center">Adj Days</label>
                  <input type="number" step="0.5" {...register("days_adjusted")} placeholder="0" className="w-full border border-slate-300 rounded-md px-2 py-2 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono" />
                </div>
              )}
            </div>

            <div className="sm:col-span-4 grid grid-cols-2 gap-2 h-[68px]">
              <div className="bg-yellow-50 rounded-lg flex flex-col items-center justify-center border border-yellow-200 shadow-sm">
                 <span className="text-[9px] font-bold text-yellow-800 uppercase tracking-wider text-center">Total Days</span>
                 <span className="text-base font-extrabold text-slate-900 mt-0.5">{fmt2(calculations?.total_days_worked)}</span>
              </div>
              <div className="bg-yellow-50 rounded-lg flex flex-col items-center justify-center border border-yellow-200 shadow-sm">
                 <span className="text-[9px] font-bold text-yellow-800 uppercase tracking-wider text-center">Total Hrs</span>
                 <span className="text-base font-extrabold text-slate-900 mt-0.5">{fmt2(calculations?.total_hours)}</span>
              </div>
            </div>
          </div>

          {/* 4. DEDUCTIONS & POST-NET ADJUSTMENTS */}
          <div className="border-t border-slate-100 pt-5 mb-6">
            <div className="grid gap-4 sm:grid-cols-4 items-end mb-4">
              {isSalaried ? (
                <>
                  <div>
                    {/* 🔥 Make Editable & Add Visual Indicator */}
                    <label className="flex items-center justify-between block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                      <span>LOP Count</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-500 border border-indigo-100 px-1.5 py-0.5 rounded normal-case tracking-normal">Editable</span>
                    </label>
                    <input type="number" step="0.5" {...register("lop_count")} 
                      className="w-full border border-indigo-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-colors hover:border-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">Auto Credits ($)</label>
                    <input type="text" readOnly value={fmt2(calculations?.credits)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-rose-600 mb-1.5 tracking-wider">Auto Deductions ($)</label>
                    <input type="text" readOnly value={fmt2(calculations?.deductions)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500" />
                  </div>
                </>
              ) : (<div className="sm:col-span-3"></div>)}
            </div>

            <div className="grid gap-4 sm:grid-cols-4 mb-6">
              <div>
                <label className="block text-[11px] uppercase font-bold text-rose-600 mb-1.5 tracking-wider">Loans/Advances ($)</label>
                <input type="number" step="0.01" {...register("loans_advances")} placeholder="0.00"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">Reimbursements ($)</label>
                <input type="number" step="0.01" {...register("reimbursements")} placeholder="0.00"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">Final Amount Paid By MM ($)</label>
                <input type="number" step="0.01" {...register("add_amount_by_mm")} placeholder="0.00"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Reason for MM Amount</label>
                <input type="text" {...register("reason_for_add_amount")} placeholder="Brief reason"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            {/* 5. AUTO-CALCULATED RESULTS */}
            <div className="grid gap-4 sm:grid-cols-3 items-center">
              <div className="h-full">
                <div className="bg-slate-100 text-slate-700 rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-inner border border-slate-200">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Gross Pay</span>
                  <span className="text-2xl font-mono font-extrabold">${fmt2(calculations?.gross_pay)}</span>
                </div>
              </div>
              <div className="h-full">
                <div className="bg-[#4a148c] text-white rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">Net Pay</span>
                  <span className="text-2xl font-mono font-extrabold">${fmt2(calculations?.net_pay)}</span>
                </div>
              </div>
              <div className="h-full">
                <div className="bg-[#d32f2f] text-white rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-lg">
                  <span className="text-[10px] uppercase font-bold text-red-100 tracking-wider">Net Final Pay</span>
                  <span className="text-3xl font-mono font-extrabold">${fmt2(calculations?.net_final_pay)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Notes *</label>
            <input type="text" {...register("notes", { required: true })} placeholder="Description/Notes" 
              className="w-full border border-slate-300 rounded-md px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6 pt-4 flex flex-col sm:flex-row items-center gap-4">
        <button type="submit" disabled={!showTimesheet || isSaving}
          className={`px-8 py-3 w-full sm:w-auto rounded-lg font-bold text-sm shadow transition-all ${
            showTimesheet ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}>
          {isSaving ? "Saving Record..." : "Save Record"}
        </button>
        {!showTimesheet && <span className="text-xs text-rose-500 font-bold">* Please select a Pay Type to continue</span>}
      </div>
    </div>
  );
}