// /**
//  * Gets today's date in YYYY-MM-DD format for America/Chicago timezone
//  * (From your original till.html and Payroll-expense.html)
//  */
// export function todayCST() {
//   return new Intl.DateTimeFormat("en-CA", {
//     timeZone: "America/Chicago",
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//   }).format(new Date());
// }

// /**
//  * Gets today's date in YYYY-MM-DD format for the user's local timezone
//  * (From your original sales.html and variance.html)
//  */
// export function todayLocal() {
//   const d = new Date();
//   d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
//   return d.toISOString().slice(0, 10);
// }

// /**
//  * Formats a number as an Indian currency string with 0 decimal places.
//  * @param {number|string} x The number to format.
//  * @returns {string}
//  */
// export const fmt = (x) =>
//   new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
//     Number(x) || 0,
//   );

// /**
//  * Formats a number as an Indian currency string with 2 decimal places.
//  * @param {number|string} x The number to format.
//  * @returns {string}
//  */
// export const fmt2 = (x) => {
//   const value = typeof x === "number" ? x : parseFloat(x);
//   if (isNaN(value)) return "0.00";

//   return value.toFixed(2); // ✅ precise 2 decimals
// };
// /**
//  * Cleans a string and converts it to a number.
//  * @param {*} x The value to parse.
//  * @returns {number}
//  */
// export const num = (x) => {
//   if (x === null || x === undefined || x === "") return 0;

//   const parsed = parseFloat(String(x).replace(/[^0-9.\-]/g, ""));

//   return isNaN(parsed) ? 0 : parsed;
// };

// /**
//  * Trims a string value, used for text-based money inputs.
//  * (From your original cashflow.js and payroll-expenses.js)
//  * @param {string} s The string to clean.
//  * @returns {string}
//  */
// export const cleanMoney = (s) => String(s ?? "").trim();

// /**
//  * Formats a date string or object into YYYY-MM-DD.
//  * @param {string|Date} d The date to format.
//  * @returns {string}
//  */
// export const toISO = (d) => (d ? String(d).slice(0, 10) : "");

// /**
//  * Triggers a browser download for a CSV file.
//  * @param {string} filename The desired filename (e.g., "report.csv").
//  * @param {string} csvContent The full string content of the CSV.
//  */
// export function downloadCSV(filename, csvContent) {
//   const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//   const a = document.createElement("a");
//   a.href = URL.createObjectURL(blob);
//   a.download = filename;
//   a.click();
//   URL.revokeObjectURL(a.href);
// }
/**
 * Gets today's date in YYYY-MM-DD format for America/Chicago timezone
 * (From your original till.html and Payroll-expense.html)
 */
export function todayCST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Gets today's date in YYYY-MM-DD format for the user's local timezone
 * (From your original sales.html and variance.html)
 */
export function todayLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/**
 * Formats a number as a US currency string with NO decimal places (Rounded).
 * @param {number|string} x The number to format.
 * @returns {string}
 */
export const fmt = (x) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(x) || 0);

/**
 * Formats a number as a US currency string with EXACTLY 2 decimal places.
 * Includes proper comma grouping (e.g., 1,234.50)
 * @param {number|string} x The number to format.
 * @returns {string}
 */
export const fmt2 = (x) => {
  const value = typeof x === "number" ? x : parseFloat(x);
  if (isNaN(value)) return "0.00";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Cleans a string and converts it to a number.
 * @param {*} x The value to parse.
 * @returns {number}
 */
export const num = (x) => {
  if (x === null || x === undefined || x === "") return 0;

  const parsed = parseFloat(String(x).replace(/[^0-9.\-]/g, ""));

  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Trims a string value, used for text-based money inputs.
 * (From your original cashflow.js and payroll-expenses.js)
 * @param {string} s The string to clean.
 * @returns {string}
 */
export const cleanMoney = (s) => String(s ?? "").trim();

/**
 * Formats a date string or object into YYYY-MM-DD.
 * @param {string|Date} d The date to format.
 * @returns {string}
 */
export const toISO = (d) => (d ? String(d).slice(0, 10) : "");

/**
 * Triggers a browser download for a CSV file.
 * @param {string} filename The desired filename (e.g., "report.csv").
 * @param {string} csvContent The full string content of the CSV.
 */
export function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
