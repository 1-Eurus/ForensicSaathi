import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, User, Settings2, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { AuditEvent } from '../types';
import { format } from 'date-fns';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  SYSTEM:       <Settings2 className="w-3.5 h-3.5 text-slate-400" />,
  OPERATOR:     <User className="w-3.5 h-3.5 text-indigo-400" />,
  VERIFICATION: <Shield className="w-3.5 h-3.5 text-emerald-400" />,
  INTEGRITY:    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  SYSTEM:       'border-slate-700/30 bg-slate-800/20',
  OPERATOR:     'border-indigo-700/20 bg-indigo-900/10',
  VERIFICATION: 'border-emerald-700/20 bg-emerald-900/10',
  INTEGRITY:    'border-amber-700/20 bg-amber-900/10',
};

export default function AuditPage() {
  const { records } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('ALL');

  const allEvents = useMemo(() => {
    const evts: (AuditEvent & { testId: string })[] = [];
    for (const r of records) {
      for (const e of r.auditTrail) {
        evts.push({ ...e, testId: r.testId });
      }
    }
    evts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return evts;
  }, [records]);

  const categories = useMemo(() => {
    const cats = new Set(allEvents.map(e => e.category));
    return ['ALL', ...Array.from(cats)];
  }, [allEvents]);

  const filtered = useMemo(() => {
    let out = allEvents;
    if (catFilter !== 'ALL') out = out.filter(e => e.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(e =>
        e.event.toLowerCase().includes(q) ||
        e.testId.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        (e.detail ?? '').toLowerCase().includes(q)
      );
    }
    return out;
  }, [allEvents, catFilter, search]);

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-100">Global Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-0.5">{allEvents.length} events across {records.length} evidence records</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events, test IDs, actors…"
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="flex gap-1">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                catFilter === c
                  ? 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:text-slate-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      {filtered.length < allEvents.length && (
        <div className="text-xs text-slate-500 mb-3">Showing {filtered.length} of {allEvents.length} events</div>
      )}

      {/* Events */}
      <div className="panel-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/40">
                {['Timestamp', 'Test ID', 'Action', 'Actor', 'Category', 'Detail'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-slate-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-600 text-sm">No events match filter</td>
                </tr>
              )}
              {filtered.map((e, i) => (
                <tr
                  key={`${e.testId}-${e.timestamp}-${i}`}
                  onClick={() => navigate(`/test/${e.testId}`)}
                  className="border-b border-slate-800/40 hover:bg-slate-800/30 cursor-pointer group transition-colors"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-xs text-slate-400 font-mono">{format(new Date(e.timestamp), 'dd MMM HH:mm:ss')}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-mono text-indigo-400/70 group-hover:text-indigo-300 transition-colors">
                      {e.testId}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-300">{e.event}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{e.actor}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-mono ${CATEGORY_COLORS[e.category] ?? 'border-slate-700/30 bg-slate-800/20'}`}>
                      {CATEGORY_ICONS[e.category]}
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 max-w-xs truncate">{e.detail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats summary */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        {categories.filter(c => c !== 'ALL').map(c => {
          const count = allEvents.filter(e => e.category === c).length;
          return <span key={c}>{c}: <strong className="text-slate-400">{count}</strong></span>;
        })}
      </div>
    </div>
  );
}
