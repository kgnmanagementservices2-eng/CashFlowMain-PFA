
import React from "react";
import { useFormContext } from "react-hook-form";
import { fmt } from "../utils/utils";

// 🛡️ DEFINED OUTSIDE TO FIX "SINGLE INPUT" FOCUS BUG
const NumInput = ({ name, label, placeholder = "0.00", isInt = false, register }) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    <input
      type="number"
      step={isInt ? "1" : "any"}
      {...register(name)}
      placeholder={placeholder}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow font-mono"
    />
  </div>
);

// 🛡️ AUTO-CALCULATED FIELD COMPONENT
const AutoInput = ({ label, value, isHighlight = false }) => (
  <div>
    <label className={`block text-[11px] font-bold uppercase tracking-wide mb-1.5 ${isHighlight ? "text-indigo-600" : "text-slate-400"}`}>{label}</label>
    <input
      type="text"
      value={value}
      readOnly
      tabIndex={-1}
      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none font-mono font-bold cursor-not-allowed ${isHighlight ? "bg-indigo-50/50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
    />
  </div>
);

export default function CommissionForm({ calculations, availableStores, market, isSaving }) {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-6">
      
      {/* --- SECTION 1: EMPLOYEE DETAILS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div> Employee Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
            <input type="date" {...register("date", { required: "Date is required" })} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.date ? "border-rose-500 bg-rose-50" : "border-slate-300"}`} />
          </div>
          
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Market</label>
            <input type="text" value={market || "All"} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" readOnly disabled />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Store *</label>
            <select {...register("store", { required: "Store is required" })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
              <option value="">Select Store...</option>
              {availableStores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Date Period *</label>
            <div className="flex items-center gap-2">
              <input type="date" {...register("date_period_start", { required: "Start date required" })} 
                className={`w-full border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.date_period_start ? "border-rose-500 bg-rose-50" : "border-slate-300"}`} />
              <span className="text-slate-400 font-medium text-sm">to</span>
              <input type="date" {...register("date_period_end", { required: "End date required" })} 
                className={`w-full border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.date_period_end ? "border-rose-500 bg-rose-50" : "border-slate-300"}`} />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Emp ID</label>
            <input type="text" {...register("employee_id")} placeholder="e.g. PZR22233" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase" />
          </div>
          
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Employee Name *</label>
            <input type="text" {...register("employee_name", { required: "Name is required" })} placeholder="Full Name" className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.employee_name ? "border-rose-500 bg-rose-50" : "border-slate-300"}`} />
          </div>

        </div>
      </div>

      {/* --- SECTION 2: CORE SALES & ACCESSORIES --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Core Sales & Accessories
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-6 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
          <NumInput name="activation_count" label="Act Count" placeholder="0" isInt={true} register={register} />
          <NumInput name="act_comm" label="Act Comm ($)" register={register} />

          <NumInput name="upgrade_count" label="Upg Count" placeholder="0" isInt={true} register={register} />
          <NumInput name="upg_comm" label="Upg Comm ($)" register={register} />

          <NumInput name="hint_sold" label="Hint Sold" placeholder="0" isInt={true} register={register} />
          <AutoInput label="Hint Comm (Auto)" value={`$${fmt(calculations.hint_comm)}`} />

          <AutoInput label="Qual Box (Auto)" value={calculations.qualified_box} />
          <AutoInput label="Box Comm (Auto)" value={`$${fmt(calculations.box_comm)}`} isHighlight={true} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6 mt-6">
          <NumInput name="vas_mrc" label="VAS MRC ($)" register={register} />
          <NumInput name="vas_avg" label="VAS AVG ($)" register={register} />
          <div className="border-r border-slate-200 pr-4">
            <AutoInput label="VAS Comm (Auto)" value={`$${fmt(calculations.vas_commission)}`} isHighlight={true} />
          </div>

          <NumInput name="acc_profit" label="Acc Profit ($)" register={register} />
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Acc Tier</label>
            <select {...register("acc_tier")} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
              <option value="Tier 0">Tier 0</option>
              <option value="Tier 1">Tier 1</option>
              <option value="Tier 2">Tier 2</option>
              <option value="Tier 3">Tier 3</option>
              <option value="Tier 4">Tier 4</option>
            </select>
          </div>
          <NumInput name="acc_commission" label="Acc Comm ($)" register={register} />
        </div>
      </div>

      {/* --- SECTION 3: RETENTIONS & EXTRAS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400"></div> Retentions & Additions
        </h3>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6 bg-orange-50/30 p-4 rounded-lg border border-orange-100">
          {['35', '65', '95', '125', '155', '185', '215', '245', '275', '305', '335', '365'].map(day => (
             <NumInput key={day} name={`retention_${day}`} label={`Ret ${day}`} register={register} />
          ))}
          
          <div className="col-span-3 sm:col-span-4 lg:col-span-6 border-t border-orange-200 pt-4 mt-2">
            <div className="w-full sm:w-1/3 lg:w-1/4">
              <AutoInput label="Retention Comm (Auto)" value={`$${fmt(calculations.retention_commission)}`} isHighlight={true} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumInput name="leasing_done" label="Leasing Done (Count)" placeholder="0" isInt={true} register={register} />
          <AutoInput label="Leasing Comm (Auto)" value={`$${fmt(calculations.leasing_commission)}`} isHighlight={true} />
          <NumInput name="his_spiff" label="HIS SPIFF ($)" register={register} />
        </div>
      </div>

      {/* --- SECTION 4: DEDUCTIONS, CHARGEBACKS & REIMBURSEMENTS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-4 border-l-rose-500">
        <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-4 border-b border-rose-100 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div> Deductions & Chargebacks (-)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-rose-50/30 p-4 rounded-lg border border-rose-100 mb-4">
          <NumInput name="csat_score" label="CSAT Score" placeholder="e.g. 95.5" register={register} />
          <AutoInput label="CSAT Loss (Auto 10%)" value={`-$${fmt(calculations.csat_comm_loss)}`} />
          <NumInput name="rebate_chargeback" label="Rebate CB ($)" register={register} />
          <NumInput name="deposit_chargeback" label="Deposit CB ($)" register={register} />
          <NumInput name="inventory_variance_chargeback" label="Inv Var CB ($)" register={register} />
          <NumInput name="late_clock_in_chargeback" label="Late Clock In CB ($)" register={register} />
          <NumInput name="write_ups" label="Write Ups ($)" register={register} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
           <NumInput name="reimbursements" label="Reimbursements / Other Payouts (+)" register={register} />
        </div>
      </div>

      {/* --- SECTION 5: ENTRY DETAILS & PAYMENT STATUS --- */}
      <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Entry Details & Payment Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Entry / Edit Reason <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              {...register("entry_reason")} 
              placeholder="Why are you creating or editing this record?"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.entry_reason ? "border-rose-500 bg-rose-50" : "border-slate-300 bg-white"}`}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              General Notes (Optional)
            </label>
            <input 
              type="text" 
              {...register("notes")} 
              placeholder="Any additional information..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-4">
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Payment Status</label>
            <select {...register("payment_status")} 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold text-slate-700">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <NumInput name="add_amount_by_mm" label="MM Paid Amount ($)" register={register} />
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">MM Reason</label>
            <input type="text" {...register("reason_for_add_amount")} placeholder="Reason if amount differs"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white" />
          </div>
        </div>
      </div>

      {/* --- NON-STICKY FOOTER SUMMARY --- */}
      <div className="bg-slate-800 rounded-xl shadow-lg p-5 text-white flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-8 w-full">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">Gross Comm (+)</span>
            <span className="text-xl font-bold text-amber-400 font-mono">${fmt(calculations.total_commission)}</span>
          </div>
          <div className="w-px h-8 bg-slate-600 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">Deductions (-)</span>
            <span className="text-xl font-bold text-rose-400 font-mono">-${fmt(calculations.total_deductions)}</span>
          </div>
          <div className="w-px h-8 bg-slate-600 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">Reimbursements (+)</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">+${fmt(calculations.reimbursements)}</span>
          </div>
          <div className="w-px h-8 bg-slate-600 hidden sm:block"></div>
          <div className="flex flex-col bg-indigo-600/30 px-5 py-2 rounded-lg border border-indigo-500/50">
            <span className="text-[11px] uppercase font-extrabold text-indigo-300">Final Commission</span>
            <span className="text-2xl font-extrabold text-white font-mono">${fmt(calculations.final_commission)}</span>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSaving} 
          className="w-full lg:w-auto shrink-0 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white font-bold py-3 px-10 rounded-lg shadow-md transition-all hover:shadow-lg whitespace-nowrap"
        >
          {isSaving ? "Saving..." : "Save Commission Entry"}
        </button>
      </div>

    </div>
  );
}