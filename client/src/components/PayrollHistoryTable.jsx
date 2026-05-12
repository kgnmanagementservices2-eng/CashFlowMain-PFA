import React from "react";
import { fmt2, num, toISO } from "../utils/utils.js";
import TruncatedTooltip from "./TruncatedTooltip.jsx";

export default function PayrollHistoryTable({ rows = [], total = 0, isLoading = false }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-800">Daily Payroll Sheet</h2>
        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
          {rows.length} records
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</th>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Category / Pay Type</th>
              
              {/* EXCEL STYLE SPLIT HEADERS */}
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
              
              <th className="p-0 border-l-2 border-slate-200 bg-yellow-50/50 min-w-[120px]">
                <div className="block border-b border-yellow-200 py-1.5 text-center text-[10px] font-extrabold text-yellow-900 tracking-wider w-full">TOTALS</div>
                <div className="flex w-full divide-x divide-yellow-200 text-[9px] text-yellow-700 text-center font-bold tracking-wider">
                  <div className="flex-1 py-1">DAYS</div>
                  <div className="flex-1 py-1">HOURS</div>
                </div>
              </th>

              <th className="px-3 py-3 text-right bg-blue-50 text-blue-700">Gross Pay</th>
              <th className="px-3 py-3 text-right bg-purple-50 text-purple-700">Net Pay</th>
              <th className="px-3 py-3 text-right bg-red-50 text-red-700">Net Final</th>
              
              <th className="px-3 py-3 border-l-2 border-slate-200 w-48">Notes</th>
              <th className="px-3 py-3 text-center">Status</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
               <tr>
                 <td colSpan="11" className="py-8 text-center text-slate-500 font-medium">Loading records...</td>
               </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="11" className="py-8 text-center text-slate-500 font-medium">No payroll records saved for this date.</td>
              </tr>
            ) : (
              rows.map((r, index) => {
                const finalNum = num(r.net_final_pay ?? r.amount ?? r.amount_numeric ?? 0);
                return (
                  <tr key={r.id || index} className="hover:bg-blue-50 transition-colors group h-12">
                    <td className="px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium text-slate-700">
                      {toISO(r.date)}
                    </td>
                    
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-800">{r.employee_name || "-"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.employee_id || "-"}</div>
                    </td>
                    
                    <td className="px-3 py-2">
                      <div className="capitalize font-medium text-slate-600">Payroll ({r.pay_type || "-"})</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {r.pay_type === 'salaried' ? `Sal: $${fmt2(r.salary)}` : `Rate: $${fmt2(r.pay_rate)}`}
                      </div>
                    </td>
                    
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
                      <div className="flex w-full h-full divide-x divide-yellow-100/50 min-h-[3rem] text-[11px] font-mono font-bold text-slate-700">
                        <div className="flex-1 flex items-center justify-center p-1">{fmt2(r.total_days_worked)}</div>
                        <div className="flex-1 flex items-center justify-center p-1">{fmt2(r.total_hours)}</div>
                      </div>
                    </td>

                    <td className="px-3 py-2 text-right font-bold text-slate-900 bg-blue-50/30">${fmt2(r.gross_pay)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 bg-purple-50/30">${fmt2(r.net_pay)}</td>
                    
                    <td className={`px-3 py-2 text-right font-extrabold ${finalNum < 0 ? 'text-rose-600' : 'text-red-700'} bg-red-50/30`}>
                      ${fmt2(finalNum)}
                    </td>
                    
                    <td className="px-3 py-2 border-l-2 border-slate-100">
                      <TruncatedTooltip text={r.notes} maxWidth="max-w-[160px]" placeholder="-" />
                    </td>
                    
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.status || "pending"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          
          <tfoot>
            <tr className="bg-slate-100 border-t border-slate-200">
              <td className="px-3 py-3 text-right font-bold text-slate-600 uppercase" colSpan="8">Page Total:</td>
              <td className="px-3 py-3 text-right font-extrabold text-slate-900">${fmt2(total)}</td>
              <td colSpan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}