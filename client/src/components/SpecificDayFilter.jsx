import React, { useState, useRef, useEffect } from 'react';

export default function SpecificDayFilter({ availableDates = [], selectedDates = [], onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // 🔥 STAGING STATE: Holds dates before applying
  const [stagedDates, setStagedDates] = useState([]);
  const popupRef = useRef(null);

  // Sync staging state with actual selected dates when opening the dropdown
  useEffect(() => {
    if (isOpen) {
      setStagedDates(selectedDates);
    }
  }, [isOpen, selectedDates]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = (date) => {
    if (stagedDates.includes(date)) {
      setStagedDates(stagedDates.filter(d => d !== date));
    } else {
      setStagedDates([...stagedDates, date]);
    }
  };

  const handleSelectAll = () => {
    setStagedDates([...availableDates]);
  };

  const handleClearAll = () => {
    setStagedDates([]);
  };

  // 🔥 APPLY FUNCTION
  const handleApply = () => {
    onChange(stagedDates); // Send the staged dates to the parent API call
    setIsOpen(false); // Close the dropdown
  };

  return (
    <div className="relative flex items-center" ref={popupRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded transition-all focus:outline-none ${
          selectedDates.length > 0 
            ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
            : 'hover:bg-slate-200 text-slate-400'
        }`}
        title="Filter specific days"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
        </svg>
      </button>

      {/* POPUP DROPDOWN */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-lg z-50 flex flex-col max-h-80 animate-in fade-in zoom-in-95 duration-100">
          
          {/* Header with Distinct Select All / Clear All Buttons */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50 rounded-t-lg flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Select Days</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSelectAll} 
                className="text-[10px] text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
              >
                Select All
              </button>
              <span className="text-slate-300 text-[10px]">|</span>
              <button 
                onClick={handleClearAll} 
                className="text-[10px] text-rose-600 font-bold hover:text-rose-800 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          
          {/* List of Dates */}
          <div className="overflow-y-auto p-1.5 custom-scrollbar flex-1 max-h-48">
            {availableDates.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4">No dates found</div>
            ) : (
              availableDates.map(date => (
                <label key={date} className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={stagedDates.includes(date)} // 🔥 Binds to staging state
                    onChange={() => handleToggle(date)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 font-mono">{date}</span>
                </label>
              ))
            )}
          </div>
          
          {/* 🔥 NEW: Apply Footer */}
          <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end gap-2">
            <button 
              onClick={() => setIsOpen(false)} 
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleApply} 
              className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors"
            >
              Apply Filter
            </button>
          </div>

        </div>
      )}
    </div>
  );
}