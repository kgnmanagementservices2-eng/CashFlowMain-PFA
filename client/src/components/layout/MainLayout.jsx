import React, { useState, useCallback } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import { useAuth } from "/src/context/AuthContext.jsx";

export default function MainLayout({
  children,
  onNavigate,
  onBack,
  canGoBack,
  currentPage,
  pageTitle,
  pageSubtitle,
}) {
  const { user } = useAuth(); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const handleNavigate = useCallback(
    (path, options) => {
      onNavigate?.(path, options);
      closeSidebar();
    },
    [onNavigate, closeSidebar]
  );

  // Logic: Show notifications only if user is a Manager with an assigned market
const userMarket =
  user?.role === "market_manager" ? user.market : null;
  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      


      {/* Desktop sidebar (fixed left) */}
      <aside className="hidden lg:block w-64 bg-slate-900 text-white">
        <Sidebar
          onNavigate={handleNavigate}
          currentPage={currentPage}
          onClose={closeSidebar}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          id="sidebar-overlay"
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          onNavigate={handleNavigate}
          currentPage={currentPage}
          onClose={closeSidebar}
        />
      </aside>

      {/* Right side: header + content */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          onNavigate={handleNavigate}
          onBack={onBack} // Pass down
          canGoBack={canGoBack} // Pass down
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
          onToggleSidebar={openSidebar}
        />

        <main className="flex-1 overflow-y-auto no-scrollbar">
          <section className="px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}