import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Shield, ShieldAlert, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/ui/Badge';
import { resultBadgeVariant, evidenceStatusVariant } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { PresumptiveResult, EvidenceStatus } from '../types';
import { format } from 'date-fns';

type SortKey = 'timestamp' | 'confidence' | 'testId';

const RESULT_FILTERS: { label: string; value: PresumptiveResult | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Positive', value: 'PRESUMPTIVE_POSITIVE' },
  { label: 'Negative', value: 'PRESUMPTIVE_NEGATIVE' },
  { label: 'Inconclusive', value: 'INCONCLUSIVE' },
];

export default function HistoryPage() {
  const { records } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<PresumptiveResult | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    let out = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r =>
        r.testId.toLowerCase().includes(q) ||
        r.operatorId.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.protocolId.toLowerCase().includes(q)
      );
    }
    if (resultFilter !== 'ALL') {
      out = out.filter(r => r.result === resultFilter);
    }
    out.sort((a, b) => {
      const v =
        sortKey === 'timestamp' ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() :
        sortKey === 'confidence' ? a.confidenceBreakdown.overall - b.confidenceBreakdown.overall :
        a.testId.localeCompare(b.testId);
      return sortDesc ? -v : v;
    });
    return out;
  }, [records, search, resultFilter, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(d => !d);
    else { setSortKey(key); setSortDesc(true); }
  };

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 hover:text-slate-300 transition-colors ${sortKey === k ? 'text-indigo-400' : 'text-slate-600'}`}
    >
      {label}
      <span>{sortKey === k ? (sortDesc ? '↓' : '↑') : ''}</span>
    </button>
  );

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Test History</h1>
          <p className="text-sm text-slate-500 mt-0.5">{records.length} total evidence records</p>
        </div>
        <button onClick={() => navigate('/new-test')} className="btn-primary text-sm">
          + New Test
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search test ID, operator, location…"
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="flex gap-1">
          {RESULT_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setResultFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                resultFilter === f.value
                  ? 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {filtered.length < records.length && (
        <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
          <Filter className="w-3 h-3" /> Showing {filtered.length} of {records.length} records
        </div>
      )}

      {/* Table */}
      <div className="panel-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="text-left px-4 py-3"><SortBtn k="testId" label="Test ID" /></th>
                <th className="text-left px-4 py-3"><SortBtn k="timestamp" label="Timestamp" /></th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-600 font-mono uppercase">Operator</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-600 font-mono uppercase">Protocol</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-600 font-mono uppercase">Result</th>
                <th className="text-left px-4 py-3"><SortBtn k="confidence" label="Confidence" /></th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-600 font-mono uppercase">Evidence</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-600 text-sm">
                    No records match your filter
                  </td>
                </tr>
              )}
              {filtered.map(r => (
                <tr
                  key={r.testId}
                  onClick={() => navigate(`/test/${r.testId}`)}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30 cursor-pointer group transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-slate-200 group-hover:text-indigo-300 transition-colors">{r.testId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-400">{format(new Date(r.timestamp), 'dd MMM yyyy')}</div>
                    <div className="text-[10px] text-slate-600 font-mono">{format(new Date(r.timestamp), 'HH:mm:ss')}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.operatorId}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{r.protocolId}</td>
                  <td className="px-4 py-3">
                    <Badge variant={resultBadgeVariant(r.result)}>{r.resultLabel}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <ProgressBar
                        value={r.confidenceBreakdown.overall}
                        color={r.confidenceBreakdown.overall >= 80 ? 'emerald' : r.confidenceBreakdown.overall >= 60 ? 'amber' : 'red'}
                        size="sm"
                      />
                      <span className="text-xs font-mono text-slate-400">{r.confidenceBreakdown.overall}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={evidenceStatusVariant(r.evidenceStatus)}>{r.evidenceStatus}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary row */}
      <div className="mt-3 flex gap-4 text-xs text-slate-600">
        {(['PRESUMPTIVE_POSITIVE', 'PRESUMPTIVE_NEGATIVE', 'INCONCLUSIVE'] as PresumptiveResult[]).map(r => {
          const count = records.filter(x => x.result === r).length;
          const label = r === 'PRESUMPTIVE_POSITIVE' ? 'Positive' : r === 'PRESUMPTIVE_NEGATIVE' ? 'Negative' : 'Inconclusive';
          return <span key={r}>{label}: <strong className="text-slate-400">{count}</strong></span>;
        })}
        <span className="ml-auto">
          Sealed: <strong className="text-slate-400">{records.filter(r => r.evidenceStatus === 'SEALED').length}</strong>
        </span>
      </div>
    </div>
  );
}
