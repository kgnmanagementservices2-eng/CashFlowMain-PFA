import React from "react";

export default function TruncatedTooltip({ text, maxWidth = "max-w-[150px]", placeholder = "-" }) {
  if (!text) return <span className="text-slate-400">{placeholder}</span>;

  return (
    <div className="group relative flex items-center">
      {/* Truncated Text */}
      <div className={`${maxWidth} truncate cursor-help text-slate-600 font-medium`}>
        {text}
      </div>

      {/* Hover Tooltip (Production-ready floating card) */}
      <div className="absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 group-hover:block w-max max-w-xs">
        <div className="bg-slate-800 text-white text-xs rounded py-1.5 px-3 shadow-xl whitespace-normal break-words leading-relaxed">
          {text}
        </div>
        {/* Tooltip Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
      </div>
    </div>
  );
}