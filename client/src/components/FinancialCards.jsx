
import React, { useMemo } from "react";
import { fmt, num } from "../utils/utils.js";

// --- Reusable UI Components ---

const GradientCard = ({
  title,
  amount,
  loading,
  gradientFrom,
  gradientTo,
  shadowColor,
  prefix = "$",
  isNegative = false,
}) => (
  // Reduced padding on small laptops (lg:p-4) to give the text more breathing room
  <div className={`relative overflow-hidden rounded-2xl p-3 sm:p-5 lg:p-4 xl:p-6 text-white shadow-lg bg-gradient-to-br ${gradientFrom} ${gradientTo} ${shadowColor} transition-transform hover:-translate-y-1 duration-300 flex flex-col justify-between`}>
    <div className="relative z-10">
      {/* Title scales down on medium screens so it doesn't crowd the number */}
      <h3 className="text-white/90 text-[9px] sm:text-[11px] lg:text-[9px] xl:text-[11px] font-bold tracking-wider uppercase mb-1.5 min-h-[2.5rem] flex items-start leading-tight">
        {title}
      </h3>
      
      {/* Removed truncate! Font shrinks to text-lg on lg screens, expands to text-3xl on large screens */}
      <div className="text-lg sm:text-2xl md:text-3xl lg:text-lg xl:text-2xl 2xl:text-3xl font-extrabold tracking-tight break-words">
        {loading ? "..." : (
          <>
            {isNegative ? "-" : ""}
            {prefix}
            {fmt(Math.abs(amount))}
          </>
        )}
      </div>
    </div>
    
    <div className="absolute -right-6 -top-6 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/10 blur-2xl"></div>
    <div className="absolute -bottom-8 -left-8 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 blur-xl"></div>
  </div>
);

const SubExpenseCard = ({
  title,
  amount,
  loading,
  gradientFrom,
  gradientTo,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`relative overflow-hidden rounded-xl p-3 sm:p-4 text-white shadow-md bg-gradient-to-br ${gradientFrom} ${gradientTo} transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] ${onClick ? "cursor-pointer hover:ring-2 hover:ring-white/40" : ""}`}
  >
    <div className="relative z-10 flex flex-col justify-between h-full">
      <h3 className="text-white/90 text-[9px] sm:text-[10px] font-bold uppercase leading-tight mb-1">
        {title}
      </h3>
      {/* Removed truncate! */}
      <div className="text-base sm:text-xl lg:text-base xl:text-xl font-extrabold break-words">
        {loading ? "..." : `$${fmt(amount)}`}
      </div>
    </div>
  </div>
);

export default function FinancialCards({
  sales = 0,
  bank = 0,
  pickup = 0,
  expenses = 0,
  storeExpenses = 0,
  payroll = 0,
  commission = 0,
  openingBalance = 0, 
  loading = false,
  onNavigate, 
}) {
  const {
    actualVariance,
    finalCashInHand,
    cashPickup,
  } = useMemo(() => {
    const s = num(sales);
    const b = num(bank);
    const p = num(pickup);
    const e = num(expenses);
    const ob = num(openingBalance);

    const cashPickupCalc = s - b;
    const variance = cashPickupCalc - p;
    const cashInHandCalc = ob + ((p - e) + variance);

    return {
      actualVariance: variance,
      finalCashInHand: cashInHandCalc,
      cashPickup: cashPickupCalc,
    };
  }, [sales, bank, pickup, expenses, openingBalance]);

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* TOP ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-3 xl:gap-6">
        <GradientCard title="Total Cash (Sales)" amount={sales} loading={loading} gradientFrom="from-purple-600" gradientTo="to-indigo-700" shadowColor="shadow-indigo-200" />
        <GradientCard title="Total Cash In Bank" amount={bank} loading={loading} gradientFrom="from-blue-500" gradientTo="to-cyan-600" shadowColor="shadow-cyan-200" />
        <GradientCard title="Cash in Hand" amount={cashPickup} loading={loading} isNegative={cashPickup < 0}
          gradientFrom={cashPickup >= 0 ? "from-orange-400" : "from-red-500"}
          gradientTo={cashPickup >= 0 ? "to-amber-500" : "to-rose-600"}
          shadowColor={cashPickup >= 0 ? "shadow-orange-200" : "shadow-rose-200"}
        />
        <GradientCard title="Pick Up Amount" amount={pickup} loading={loading} gradientFrom="from-emerald-500" gradientTo="to-teal-600" shadowColor="shadow-emerald-200" />
        <GradientCard title="Actual Variance" amount={actualVariance} loading={loading} isNegative={actualVariance < 0}
          gradientFrom={actualVariance >= 0 ? "from-teal-400" : "from-rose-500"}
          gradientTo={actualVariance >= 0 ? "to-emerald-500" : "to-red-600"}
          shadowColor={actualVariance >= 0 ? "shadow-teal-200" : "shadow-red-200"}
        />
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">

        {/* Expenses */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow border p-4 sm:p-5">
          <div className="flex justify-between mb-4 border-b pb-3 items-center">
            <h3 className="font-bold text-sm text-slate-800">Expenses Breakdown</h3>
            <div className="text-lg sm:text-xl font-bold text-rose-600">
              {loading ? "..." : `$${fmt(expenses)}`}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <SubExpenseCard
              title="Store Expenses"
              amount={storeExpenses}
              loading={loading}
              gradientFrom="from-rose-400"
              gradientTo="to-pink-500"
              onClick={() => onNavigate?.("expense-history")} 
            />

            <SubExpenseCard
              title="Payroll"
              amount={payroll}
              loading={loading}
              gradientFrom="from-pink-500"
              gradientTo="to-rose-600"
              onClick={() => onNavigate?.("payroll-history")} 
            />

            <SubExpenseCard
              title="Commission"
              amount={commission}
              loading={loading}
              gradientFrom="from-fuchsia-500"
              gradientTo="to-purple-600"
              onClick={() => onNavigate?.("commission-history")} 
            />
          </div>
        </div>

        {/* Cash In Hand */}
        <div className="flex relative">
          <div className={`w-full rounded-2xl p-5 sm:p-6 text-white text-center flex flex-col justify-center items-center relative overflow-hidden ${
            finalCashInHand >= 0
              ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-200"
              : "bg-gradient-to-br from-red-500 to-rose-700 shadow-rose-200"
          }`}>
            <div className="relative z-10 w-full">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-white/90">
                Final Cash In Hand
              </h3>
              <div className="text-3xl sm:text-4xl font-extrabold mb-4 break-words">
                {loading
                  ? "..."
                  : `${finalCashInHand < 0 ? "-" : ""}$${fmt(Math.abs(finalCashInHand))}`}
              </div>

              <div className="text-[10px] sm:text-[11px] font-bold bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm border border-white/10 inline-flex items-center justify-center max-w-full">
                <span>Prev Balance:</span> <span className="font-mono ml-1">${fmt(openingBalance)}</span>
              </div>
            </div>

            {/* Background decorative blurs */}
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
          </div>
        </div>

      </div>
    </div>
  );
}