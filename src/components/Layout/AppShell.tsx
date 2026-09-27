import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Shield, LayoutDashboard, FlaskConical, History,
  FileSearch, ClipboardList, Settings, LogOut,
  ChevronRight, Wifi, Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Command Centre' },
  { to: '/new-test',     icon: FlaskConical,    label: 'New Field Test' },
  { to: '/history',      icon: History,         label: 'Test History' },
  { to: '/audit',        icon: ClipboardList,   label: 'Audit Trail' },
  { to: '/verify',       icon: FileSearch,      label: 'Verify Evidence' },
  { to: '/settings',     icon: Settings,        label: 'Protocols & Settings' },
];

export default function AppShell() {
  const { operator, logout, stats } = useApp();
  const navigate = useNavigate();
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0d12]">
      {/* ─── Sidebar ─── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-[#0f1319] border-r border-slate-800/70">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-widest text-slate-100 font-mono">FIELDPROOF</div>
              <div className="text-[10px] text-slate-500 tracking-wider">EVIDENCE INTEGRITY ENGINE</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-indigo-400/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* System status */}
        <div className="px-3 py-3 border-t border-slate-800/70 space-y-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-500">System Online</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Wifi className="w-3 h-3" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2">
            <Clock className="w-3 h-3 text-slate-600" />
            <span className="text-[11px] font-mono text-slate-500">
              {format(time, 'HH:mm:ss')} IST
            </span>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">{operator?.id}</div>
              <div className="text-[10px] text-slate-600">{operator?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-2">
            <div className="flex items-center justify-between text-[10px] text-slate-600">
              <span>FIELDPROOF v1.0.0</span>
              <span>SIH 2026 — PS 26231</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex-shrink-0 h-12 bg-[#0f1319]/80 border-b border-slate-800/50 flex items-center justify-between px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 font-mono">SESSION</div>
            <div className="text-xs font-mono text-slate-300">{operator?.sessionId}</div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="text-xs text-slate-500 font-mono">DEVICE</div>
            <div className="text-xs font-mono text-slate-300">{operator?.deviceId}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-amber-400/80 font-mono">{stats.evidenceSealed}</span>
              <span>sealed</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-emerald-400/80 font-mono">{stats.totalTests}</span>
              <span>total tests</span>
            </div>
            <div className="w-px h-4 bg-slate-800" />
            <div className="px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-amber-900/20 text-amber-400 border border-amber-700/30">
              PRESUMPTIVE RESULTS ONLY
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
