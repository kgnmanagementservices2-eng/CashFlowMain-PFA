import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import MainLayout from "../layout/MainLayout.jsx";

export default function ProtectedRoute({
  children,
  roles = [],
  onNavigate,
  onBack,
  canGoBack,
  currentPage,
  pageTitle,
  pageSubtitle,
}) {
  const { isAuthenticated, loading, user } = useAuth();

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        Loading session...
      </div>
    );
  }

  // 🔐 Not logged in
  if (!isAuthenticated) {
    return null; // App.jsx already redirects to login
  }

  // 🛡️ Role check
  const userRole = user?.role;
  const isAllowed =
    !roles.length || (userRole && roles.includes(userRole));

  if (!isAllowed) {
    return (
      <MainLayout
        onNavigate={onNavigate}
        onBack={onBack}
        canGoBack={canGoBack}
        currentPage={currentPage}
        pageTitle="Access denied"
        pageSubtitle=""
      >
        <div className="p-6 text-red-600">
          You do not have permission to view this page.
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      onNavigate={onNavigate}
      onBack={onBack}
      canGoBack={canGoBack}
      currentPage={currentPage}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
    >
      {children}
    </MainLayout>
  );
}