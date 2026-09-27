import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import AppShell from './components/Layout/AppShell';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import NewTestPage from './pages/NewTestPage';
import TestDetailPage from './pages/TestDetailPage';
import VerificationPage from './pages/VerificationPage';
import HistoryPage from './pages/HistoryPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';
import SupervisorReviewPage from './pages/SupervisorReviewPage';
import ChainOfCustodyPage from './pages/ChainOfCustodyPage';
import { Shield } from 'lucide-react';

/** Redirects to /login when no user is authenticated; shows spinner during auth check */
function RequireAuth() {
  const { user, loading } = useApp();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d12] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="w-5 h-5 border-2 border-indigo-300/30 border-t-indigo-300 rounded-full spinner mx-auto" />
          <p className="text-xs text-slate-600 font-mono">Verifying session…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Protected — rendered inside AppShell sidebar layout */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/new-test"     element={<NewTestPage />} />
          <Route path="/test/:testId" element={<TestDetailPage />} />
          <Route path="/verify"       element={<VerificationPage />} />
          <Route path="/history"      element={<HistoryPage />} />
          <Route path="/audit"        element={<AuditPage />} />
          <Route path="/settings"     element={<SettingsPage />} />
          <Route path="/review"       element={<SupervisorReviewPage />} />
          <Route path="/custody"      element={<ChainOfCustodyPage />} />
          <Route path="/custody/:testId" element={<ChainOfCustodyPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}
