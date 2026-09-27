/**
 * ForensicSaathi — Chain of Custody Page
 * Shows the full chain of custody timeline for all tests, or a specific test.
 * Allows adding new custody transfer events.
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Link2, Plus, Package, ArrowRightLeft, FlaskConical,
  Archive, ShieldCheck, ClipboardCheck, Search, ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CustodyTimeline } from '../components/Evidence/CustodyTimeline';
import type { CustodyEvent, EvidencePackage } from '../types';

// Auto-generate chain of custody events from an evidence record
function buildDefaultCustodyEvents(record: EvidencePackage): CustodyEvent[] {
  const events: CustodyEvent[] = [];
  const base = new Date(record.timestamp).getTime();

  // Collection event
  events.push({
    id: `${record.testId}-coc-001`,
    timestamp: new Date(base - 10 * 60 * 1000).toISOString(),
    action: 'Sample Collected from Field',
    actor: record.operatorId,
    role: 'FIELD_OPERATOR',
    location: record.location ?? 'Field Location',
    notes: `Protocol: ${record.protocolId}`,
    category: 'COLLECTION',
  });

  // Analysis event
  events.push({
    id: `${record.testId}-coc-002`,
    timestamp: record.timestamp,
    action: 'Field Test Performed (ForensicSaathi CV Analysis)',
    actor: record.operatorId,
    role: 'FIELD_OPERATOR',
    location: record.location ?? 'Field Location',
    notes: `Result: ${record.resultLabel ?? record.result} · Confidence: ${record.confidence}%`,
    category: 'ANALYSIS',
  });

  // Sealing event
  events.push({
    id: `${record.testId}-coc-003`,
    timestamp: new Date(base + 2 * 60 * 1000).toISOString(),
    action: 'Evidence Package Sealed & Hashed',
    actor: 'ForensicSaathi-SYSTEM',
    role: 'AUTOMATED SYSTEM',
    notes: `Evidence hash: ${record.evidenceHash?.slice(0, 16)}…`,
    category: 'STORAGE',
  });

  // Add verification event if present
  if (record.verificationStatus === 'VERIFIED') {
    events.push({
      id: `${record.testId}-coc-004`,
      timestamp: new Date(base + 5 * 60 * 1000).toISOString(),
      action: 'Cryptographic Integrity Verified',
      actor: record.operatorId,
      role: 'FIELD_OPERATOR',
      notes: 'Hash match: PASSED',
      category: 'VERIFICATION',
    });
  }

  // Add review event if present
  if (record.reviewStatus && record.reviewedBy) {
    events.push({
      id: `${record.testId}-coc-005`,
      timestamp: record.reviewedAt ?? new Date(base + 30 * 60 * 1000).toISOString(),
      action: `Supervisor Review — ${record.reviewStatus}`,
      actor: record.reviewedBy,
      role: 'SUPERVISOR',
      notes: record.reviewNotes,
      category: 'REVIEW',
    });
  }

  return events;
}

// ─── Add Event Modal ──────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: CustodyEvent['category'][] = [
  'COLLECTION', 'TRANSFER', 'ANALYSIS', 'STORAGE', 'VERIFICATION', 'REVIEW', 'DISPOSAL',
];

function AddEventModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (e: Omit<CustodyEvent, 'id' | 'timestamp'>) => void;
}) {
  const [form, setForm] = useState<{
    action: string;
    actor: string;
    role: string;
    category: CustodyEvent['category'];
    location: string;
    notes: string;
  }>({
    action: '',
    actor: '',
    role: '',
    category: 'TRANSFER',
    location: '',
    notes: '',
  });

  const isValid = form.action.trim().length > 0 && form.actor.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f1319] border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-md space-y-4 p-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
            <Plus className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm">Add Custody Event</div>
            <div className="text-[10px] text-slate-500">Log a chain-of-custody transfer or action</div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Event Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as CustodyEvent['category'] }))}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
            >
              {CATEGORY_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Action Description *</label>
            <input
              value={form.action}
              onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
              placeholder="e.g., Sample transferred to forensic lab"
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Actor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Actor / Handler *</label>
              <input
                value={form.actor}
                onChange={e => setForm(f => ({ ...f, actor: e.target.value }))}
                placeholder="e.g., OP-104"
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</label>
              <input
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="e.g., SUPERVISOR"
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Location</label>
            <input
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g., Forensic Lab, Mumbai"
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional details…"
              rows={2}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-xs">Cancel</button>
          <button
            disabled={!isValid}
            onClick={() => onAdd({
              action:   form.action,
              actor:    form.actor,
              role:     form.role,
              category: form.category,
              location: form.location || undefined,
              notes:    form.notes || undefined,
            })}
            className="btn-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ChainOfCustodyPage() {
  const { testId } = useParams<{ testId?: string }>();
  const { records, updateRecord } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(testId ?? null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filteredRecords = records.filter(r =>
    !search ||
    r.testId.toLowerCase().includes(search.toLowerCase()) ||
    r.protocolId.toLowerCase().includes(search.toLowerCase()) ||
    r.operatorId.toLowerCase().includes(search.toLowerCase())
  );

  const selectedRecord = records.find(r => r.testId === selectedId);
  const custodyEvents: CustodyEvent[] = selectedRecord
    ? (selectedRecord.custodyEvents?.length
        ? selectedRecord.custodyEvents
        : buildDefaultCustodyEvents(selectedRecord))
    : [];

  const handleAddEvent = (partial: Omit<CustodyEvent, 'id' | 'timestamp'>) => {
    if (!selectedRecord) return;
    const existing = selectedRecord.custodyEvents?.length
      ? selectedRecord.custodyEvents
      : buildDefaultCustodyEvents(selectedRecord);
    const newEvent: CustodyEvent = {
      ...partial,
      id: `${selectedRecord.testId}-coc-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    updateRecord(selectedRecord.testId, { custodyEvents: [...existing, newEvent] });
    setShowAddModal(false);
    setToast(`Custody event added to ${selectedRecord.testId}`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="h-full flex animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-xl bg-emerald-900/90 text-emerald-300 border border-emerald-700/40 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Add event modal */}
      {showAddModal && selectedRecord && (
        <AddEventModal onClose={() => setShowAddModal(false)} onAdd={handleAddEvent} />
      )}

      {/* ─── Left panel: record selector ─── */}
      <div className="w-72 flex-shrink-0 border-r border-slate-800/60 flex flex-col bg-[#0f1319]/50">
        <div className="p-4 border-b border-slate-800/60">
          <h2 className="text-sm font-bold text-slate-100 mb-3">Chain of Custody</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search records…"
              className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-600">No records found</div>
          ) : filteredRecords.map(r => (
            <button
              key={r.testId}
              onClick={() => setSelectedId(r.testId)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                selectedId === r.testId
                  ? 'bg-indigo-600/15 border border-indigo-500/20 text-indigo-200'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="font-mono text-xs font-bold">{r.testId}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {r.protocolId} · {r.operatorId}
              </div>
              <div className={`text-[10px] mt-0.5 font-semibold ${
                r.result === 'PRESUMPTIVE_POSITIVE' ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {r.result === 'PRESUMPTIVE_POSITIVE' ? 'POSITIVE' : 'NEGATIVE'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Right panel: timeline ─── */}
      <div className="flex-1 overflow-auto">
        {!selectedRecord ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Link2 className="w-12 h-12 text-slate-700 mb-4" />
            <div className="text-slate-400 text-sm mb-1">Select a test record</div>
            <div className="text-slate-600 text-xs">
              Choose a record from the left panel to view its full chain of custody
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <button onClick={() => navigate('/dashboard')} className="hover:text-slate-300">Dashboard</button>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-slate-300">Chain of Custody</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="font-mono text-slate-300">{selectedRecord.testId}</span>
                </div>
                <h1 className="text-lg font-bold text-slate-100 font-mono">{selectedRecord.testId}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedRecord.protocolId} · {selectedRecord.operatorId} · {selectedRecord.location}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/test/${selectedRecord.testId}`)}
                  className="btn-secondary text-xs"
                >
                  View Evidence <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Event
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Events',  value: custodyEvents.length,                                    color: 'text-slate-300' },
                { label: 'Transfers',     value: custodyEvents.filter(e => e.category === 'TRANSFER').length,    color: 'text-amber-400' },
                { label: 'Verifications', value: custodyEvents.filter(e => e.category === 'VERIFICATION').length, color: 'text-emerald-400' },
                { label: 'Reviews',       value: custodyEvents.filter(e => e.category === 'REVIEW').length,       color: 'text-indigo-400' },
              ].map(s => (
                <div key={s.label} className="panel-elevated p-3">
                  <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className="panel-elevated p-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-5">
                Custody Timeline — {custodyEvents.length} events
              </div>
              <CustodyTimeline events={custodyEvents} />
            </div>

            {/* Evidence integrity summary */}
            <div className="panel-elevated p-4 border border-slate-700/30">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Evidence Integrity Summary</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ['Evidence Hash',     selectedRecord.evidenceHash?.slice(0, 24) + '…'],
                  ['Evidence Status',   selectedRecord.evidenceStatus],
                  ['Review Status',     selectedRecord.reviewStatus ?? 'PENDING_REVIEW'],
                  ['Verification',      selectedRecord.verificationStatus],
                ].map(([l, v]) => (
                  <div key={l} className="bg-slate-800/30 rounded-lg p-2.5">
                    <div className="text-slate-600 text-[10px] mb-0.5">{l}</div>
                    <div className="font-mono text-slate-300">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
