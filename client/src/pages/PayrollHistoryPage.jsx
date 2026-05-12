import React from "react";
import HistoryPage from "./HistoryPage.jsx";

/**
 * This is a simple "wrapper" component.
 * It renders the reusable HistoryPage and tells it
 * to fetch the "payroll" category.
 */
export default function PayrollHistoryPage() {
  return <HistoryPage category="payroll" />;
}
