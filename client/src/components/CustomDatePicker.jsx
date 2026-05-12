import React from "react";
import { Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Helper to convert your DB "YYYY-MM-DD" string to a JS Date object safely
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d);
};

// Helper to convert the JS Date object back to "YYYY-MM-DD" for your API
const formatDate = (dateObj) => {
  if (!dateObj) return "";
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function CustomDatePicker({ name, control, rules, error, placeholder = "MM/DD/YYYY" }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, onBlur, value } }) => (
        <div className="relative w-full">
          <DatePicker
            dateFormat="MM/dd/yyyy"
            selected={parseDate(value)}
            onChange={(date) => onChange(formatDate(date))}
            onBlur={onBlur}
            placeholderText={placeholder}
            wrapperClassName="w-full"
            // 🔥 Professional UI styling 
            className={`w-full border rounded-lg pl-3 pr-10 py-2 text-sm outline-none transition-all duration-200 text-slate-800 ${
              error
                ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500"
                : "border-slate-300 bg-white hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            }`}
          />
          
          {/* 🔥 Custom Calendar Icon positioned on the right */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      )}
    />
  );
}