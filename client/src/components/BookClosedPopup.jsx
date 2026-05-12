import React from "react";

export default function BookClosedPopup({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      
      {/* Blurred Backdrop (Clickable to close) */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 fade-in duration-200 flex flex-col">
        
        {/* Top Decorator Gradient Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400" />

        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          
          {/* Icon Container with subtle pulse background */}
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-rose-100 rounded-full animate-ping opacity-50" style={{ animationDuration: '3s' }} />
            <div className="relative bg-rose-50 text-rose-600 p-4 rounded-full shadow-sm border border-rose-100">
              {/* Lock Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Text Content */}
          <h3 className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">
            Accounting Month Locked
          </h3>
          <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
            The accounting book for this month has been closed. No new entries, modifications, or approvals can be processed.
          </p>

          {/* Administrator Info Box */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 w-full mb-6 text-left flex items-start gap-3 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-snug">
              Need to make a change? Please contact your <span className="font-bold text-slate-800">Administrator</span> to reopen this month.
            </p>
          </div>

          {/* Action Button */}
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            Understood, Go Back
          </button>
        </div>
      </div>
    </div>
  );
}