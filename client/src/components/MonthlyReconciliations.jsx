// // src/components/MonthlyReconciliations.jsx
// import React, { useState, useEffect } from "react";
// import { useGlobalState } from "../context/GlobalStateContext.jsx";
// import api from "../services/api.js";

// export default function MonthlyReconciliations() {
//   const { selectedMarket } = useGlobalState();
//   const [isOpen, setIsOpen] = useState(false);
//   const [history, setHistory] = useState([]);
//   const [loading, setLoading] = useState(false);
  
//   // Default to the current year and the previous month
//   const today = new Date();
//   const defaultYear = today.getFullYear();
//   const defaultMonth = today.getMonth() === 0 ? 12 : today.getMonth(); // If Jan, default to Dec
//   const initialYear = today.getMonth() === 0 ? defaultYear - 1 : defaultYear;

//   const [year, setYear] = useState(initialYear);
//   const [month, setMonth] = useState(defaultMonth);

//   // Fetch closed months history
//   const loadHistory = async () => {
//     if (!selectedMarket) return;
//     try {
//       setLoading(true);
//       const data = await api.getReconciliations(selectedMarket);
//       setHistory(data);
//     } catch (err) {
//       console.error("Failed to load history:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Reload history whenever the modal opens or the market changes
//   useEffect(() => {
//     if (isOpen) {
//       loadHistory();
//     }
//   }, [isOpen, selectedMarket]);

//   // Handle closing a book
//   const handleCloseBook = async () => {
//     if (!selectedMarket) return alert("Select a market first.");
    
//     const confirmMessage = `Are you sure you want to CLOSE books for ${month}/${year} in ${selectedMarket}?\n\nNo new entries, approvals, or modifications can be made for this month once closed.`;
    
//     if (!window.confirm(confirmMessage)) return;
    
//     try {
//       setLoading(true);
//       await api.closeBook({ market: selectedMarket, year, month });
//       alert(`Book for ${month}/${year} closed successfully!`);
//       loadHistory(); // Refresh the table
//     } catch (err) {
//       alert(err.message || "Failed to close the book.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle reopening a book
//   const handleReopen = async (id, recordMonth) => {
//     const formattedMonth = new Date(recordMonth).toISOString().substring(0, 7);
    
//     if (!window.confirm(`Are you sure you want to REOPEN ${formattedMonth}?\n\nThis will allow users to edit and add records for this month again.`)) return;
    
//     try {
//       setLoading(true);
//       await api.reopenBook(id);
//       alert(`${formattedMonth} has been reopened successfully.`);
//       loadHistory(); // Refresh the table
//     } catch (err) {
//       alert(err.message || "Failed to reopen the book.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <>
//       {/* Trigger Button */}
//       <button 
//         onClick={() => setIsOpen(true)}
//         className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm px-5 py-2 rounded-lg shadow-md transition-colors"
//       >
//         Monthly Recon
//       </button>

//       {/* Modal Overlay */}
//       {isOpen && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all">
            
//             {/* Modal Header */}
//             <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
//               <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
//                 Monthly Reconciliations
//               </h2>
//               <button 
//                 onClick={() => setIsOpen(false)} 
//                 className="text-slate-400 hover:text-rose-500 font-bold text-xl transition-colors px-2"
//               >
//                 ✕
//               </button>
//             </div>

//             {/* Modal Body */}
//             <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              
//               {/* Close New Book Form */}
//               <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl flex flex-wrap items-end gap-4 mb-8 shadow-sm">
//                 <div>
//                   <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wide mb-1.5">
//                     Year
//                   </label>
//                   <input 
//                     type="number" 
//                     value={year} 
//                     onChange={(e) => setYear(e.target.value)} 
//                     className="w-24 border border-indigo-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wide mb-1.5">
//                     Month
//                   </label>
//                   <select 
//                     value={month} 
//                     onChange={(e) => setMonth(e.target.value)} 
//                     className="w-32 border border-indigo-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
//                   >
//                     {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
//                       <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })} ({m})</option>
//                     ))}
//                   </select>
//                 </div>
//                 <button 
//                   onClick={handleCloseBook} 
//                   disabled={loading || !selectedMarket}
//                   className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2 rounded-lg ml-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
//                 >
//                   {loading ? "Processing..." : "Lock Month"}
//                 </button>
//               </div>

//               {/* History Section */}
//               <div className="mb-2 flex items-center justify-between">
//                 <h3 className="font-bold text-slate-700">Closed Months History</h3>
//                 <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
//                   {selectedMarket || "No Market Selected"}
//                 </span>
//               </div>
              
//               <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
//                 {history.length === 0 ? (
//                   <div className="p-8 text-center text-slate-500 italic bg-slate-50 text-sm">
//                     No closed months found for this market.
//                   </div>
//                 ) : (
//                   <table className="w-full text-left text-sm whitespace-nowrap">
//                     <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-xs">
//                       <tr>
//                         <th className="px-4 py-3">Month</th>
//                         <th className="px-4 py-3">Market</th>
//                         <th className="px-4 py-3 text-right">Carry Fwd Balance</th>
//                         <th className="px-4 py-3 text-center">Action</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100 bg-white">
//                       {history.map(record => (
//                         <tr key={record.id} className="hover:bg-slate-50 transition-colors">
//                           <td className="px-4 py-3 font-semibold text-slate-700">
//                             {new Date(record.reconciliation_month).toISOString().substring(0, 7)}
//                           </td>
//                           <td className="px-4 py-3 capitalize text-slate-600">
//                             {record.market}
//                           </td>
//                           <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
//                             ${Number(record.opening_balance).toFixed(2)}
//                           </td>
//                           <td className="px-4 py-3 text-center">
//                             <button 
//                               onClick={() => handleReopen(record.id, record.reconciliation_month)}
//                               disabled={loading}
//                               className="text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
//                             >
//                               Reopen
//                             </button>
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 )}
//               </div>

//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }
import React, { useState, useEffect } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";

export default function MonthlyReconciliations() {
  const { selectedMarket } = useGlobalState();
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Default to the current year and the previous month
  const today = new Date();
  const defaultYear = today.getFullYear();
  const defaultMonth = today.getMonth() === 0 ? 12 : today.getMonth(); // If Jan, default to Dec
  const initialYear = today.getMonth() === 0 ? defaultYear - 1 : defaultYear;

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(defaultMonth);

  // Fetch closed months history
  const loadHistory = async () => {
    if (!selectedMarket) return;
    try {
      setLoading(true);
      const data = await api.getReconciliations(selectedMarket);
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reload history whenever the modal opens or the market changes
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, selectedMarket]);

  // Handle closing a book
  const handleCloseBook = async () => {
    if (!selectedMarket) return alert("Select a market first.");
    
    const confirmMessage = `Are you sure you want to CLOSE books for ${month}/${year} in ${selectedMarket.toUpperCase()}?\n\nNo new entries, approvals, or modifications can be made for this month once closed.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      setLoading(true);
      await api.closeBook({ market: selectedMarket, year, month });
      loadHistory(); // Refresh the table
    } catch (err) {
      alert(err.message || "Failed to close the book.");
    } finally {
      setLoading(false);
    }
  };

  // Handle reopening a book
  const handleReopen = async (id, recordMonth) => {
    const formattedMonth = new Date(recordMonth).toISOString().substring(0, 7);
    
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to REOPEN ${formattedMonth}?\n\nThis will unlock all records and allow users to edit and add entries for this month again.`)) return;
    
    try {
      setLoading(true);
      await api.reopenBook(id);
      loadHistory(); // Refresh the table
    } catch (err) {
      alert(err.message || "Failed to reopen the book.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button (Sidebar) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-950 text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-0.5 border border-slate-700 w-full"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Monthly Reconcilliations
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shadow-sm border border-indigo-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                    Monthly Reconciliations
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Lock accounting books and carry forward balances</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 hover:bg-slate-100 hover:text-slate-700 p-2 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
              
              {/* --- ACTION PANEL: Lock New Book Form --- */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm mb-8">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  Lock Month
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  
                  {/* MARKET (Read Only Display) */}
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Market
                    </label>
                    <input 
                      type="text" 
                      value={selectedMarket ? selectedMarket.toUpperCase() : "Select Market"} 
                      disabled
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-500 bg-slate-50 cursor-not-allowed" 
                    />
                  </div>

                  {/* YEAR */}
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Year
                    </label>
                    <input 
                      type="number" 
                      value={year} 
                      onChange={(e) => setYear(e.target.value)} 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-shadow" 
                    />
                  </div>

                  {/* MONTH */}
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Month
                    </label>
                    <select 
                      value={month} 
                      onChange={(e) => setMonth(e.target.value)} 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-shadow"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>
                          {new Date(0, m - 1).toLocaleString('default', { month: 'short' })} ({m})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="sm:col-span-1">
                    <button 
                      onClick={handleCloseBook} 
                      disabled={loading || !selectedMarket}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                      {loading ? (
                        <span className="animate-pulse">Locking...</span>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                          Lock Book
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {!selectedMarket && (
                  <p className="text-xs text-amber-600 font-bold mt-3 flex items-center gap-1.5 bg-amber-50 p-2 rounded-md border border-amber-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    Please select a Market from the sidebar first.
                  </p>
                )}
              </div>

              {/* --- HISTORY SECTION --- */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-800">Closed Months History</h3>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {selectedMarket || "None"}
                </span>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-h-[300px] flex flex-col">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center">
                    <div className="bg-slate-50 text-slate-300 p-4 rounded-full mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <p className="text-slate-500 font-bold text-sm">No closed months found.</p>
                    <p className="text-slate-400 text-xs mt-1">Select a market and lock a month to see it here.</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="px-5 py-3">Locked Month</th>
                          <th className="px-5 py-3">Market</th>
                          <th className="px-5 py-3 text-right">Carry Fwd Balance</th>
                          <th className="px-5 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {history.map(record => (
                          <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group h-12">
                            <td className="px-5 py-2 font-bold text-slate-700">
                              {new Date(record.reconciliation_month).toISOString().substring(0, 7)}
                            </td>
                            <td className="px-5 py-2 capitalize font-medium text-slate-600">
                              {record.market}
                            </td>
                            <td className="px-5 py-2 text-right">
                              <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                                ${Number(record.opening_balance).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-5 py-2 text-center">
                              <button 
                                onClick={() => handleReopen(record.id, record.reconciliation_month)}
                                disabled={loading}
                                className="flex items-center justify-center gap-1.5 mx-auto text-[11px] font-bold text-slate-500 hover:text-rose-700 bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                Reopen
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}