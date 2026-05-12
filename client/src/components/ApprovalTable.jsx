import React from "react";

/**
 * Reusable Table Component for Approval Pages
 * @param {Array} columns - Array of objects { header, render(row), className }
 * @param {Array} rows - Data to display
 * @param {Boolean} isLoading - Loading state
 * @param {Object} pagination - { currentPage, totalPages, onNext, onPrev }
 * @param {String|Boolean} title - Optional title to display (pass false to hide header)
 */
export default function ApprovalTable({
  columns = [],
  rows = [],
  isLoading = false,
  pagination = { currentPage: 1, totalPages: 1, onNext: () => {}, onPrev: () => {} },
}) {
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      


      {/* Table Wrapper */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-3 py-3 ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-500 font-medium">
                  <span className="animate-pulse">Loading Data...</span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-500 font-medium">
                  <div className="flex flex-col items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-8 h-8 mb-3 text-slate-300"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <span>No records found matching filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr key={row.id || rIdx} className="hover:bg-blue-50 transition-colors group h-12">
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className={`px-3 py-2 ${col.className || ""}`}
                    >
                      {/* Render the cell content using the column's render function */}
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-4">
        <span className="text-xs font-bold text-slate-500">
          Page {pagination.totalPages > 0 ? pagination.currentPage : 0} of {pagination.totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={pagination.onPrev}
            disabled={pagination.currentPage === 1 || isLoading}
            className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors"
          >
            Prev
          </button>
          <button
            onClick={pagination.onNext}
            disabled={pagination.currentPage === pagination.totalPages || pagination.totalPages === 0 || isLoading}
            className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
      
    </div>
  );
}