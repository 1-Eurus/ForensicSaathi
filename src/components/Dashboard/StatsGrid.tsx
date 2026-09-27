import React from 'react';
import { FlaskConical, CalendarDays, AlertTriangle, HelpCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { DashboardStats } from '../../types';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  subtext?: string;
}

function StatCard({ label, value, icon, accent, subtext }: StatCardProps) {
  return (
    <div className="glass-panel p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold font-mono text-slate-100">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">{label}</div>
        {subtext && <div className="text-[11px] text-slate-600 mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        label="Total Tests"
        value={stats.totalTests}
        icon={<FlaskConical className="w-4.5 h-4.5 text-blue-400" />}
        accent="bg-blue-900/20 border border-blue-700/20"
      />
      <StatCard
        label="Today's Tests"
        value={stats.todayTests}
        icon={<CalendarDays className="w-4.5 h-4.5 text-indigo-400" />}
        accent="bg-indigo-900/20 border border-indigo-700/20"
        subtext={new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
      />
      <StatCard
        label="Presumptive Positive"
        value={stats.presumptivePositive}
        icon={<AlertTriangle className="w-4.5 h-4.5 text-violet-400" />}
        accent="bg-violet-900/20 border border-violet-700/20"
      />
      <StatCard
        label="Inconclusive"
        value={stats.inconclusive}
        icon={<HelpCircle className="w-4.5 h-4.5 text-amber-400" />}
        accent="bg-amber-900/20 border border-amber-700/20"
      />
      <StatCard
        label="Evidence Sealed"
        value={stats.evidenceSealed}
        icon={<ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />}
        accent="bg-emerald-900/20 border border-emerald-700/20"
      />
      <StatCard
        label="Integrity Failures"
        value={stats.integrityFailures}
        icon={<ShieldAlert className="w-4.5 h-4.5 text-red-400" />}
        accent={stats.integrityFailures > 0 ? "bg-red-900/30 border border-red-700/40" : "bg-slate-800/40 border border-slate-700/30"}
      />
    </div>
  );
}
