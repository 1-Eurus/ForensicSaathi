/**
 * ForensicSaathi — Supervisor Review Page
 * Allows supervisors / admins to review, approve, or reject field test results.
 * Operators with FIELD_OPERATOR role see their own tests awaiting review.
 * SUPERVISOR / ADMIN roles can approve, reject, or escalate.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, Clock, Shield, User, FlaskConical, Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { EvidencePackage, ReviewStatus } from '../types';
import { generateEvidencePDF } from '../utils/generatePDF';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function reviewBadge(status: ReviewStatus | undefined) {
  if (!status || status === 'PENDING_REVIEW') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-900/20 text-amber-400 border border-amber-700/30">
        <Clock className="w-2.5 h-2.5" /> PENDING REVIEW
      </span>
    );
  }
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-900/20 text-emerald-400 border border-emerald-700/30">
        <CheckCircle2 className="w-2.5 h-2.5" /> APPROVED
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-900/20 text-red-400 border border-red-700/30">
        <XCircle className="w-2.5 h-2.5" /> REJECTED
      </span>
    );
  }
  if (status === 'ESCALATED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-900/20 text-purple-400 border border-purple-700/30">
        <AlertTriangle className="w-2.5 h-2.5" /> ESCALATED
      </span>
    );
  }
  return null;
}

function resultBadge(result: string | undefined) {
  if (result === 'PRESUMPTIVE_POSITIVE') {
    return <span className="text-[10px] font-mono font-bold text-red-400">POSITIVE</span>;
  }
  if (result === 'PRESUMPTIVE_NEGATIVE') {
    return <span className="text-[10px] font-mono font-bold text-emerald-400">NEGATIVE</span>;
  }
  return <span className="text-[10px] font-mono font-bold text-amber-400">{result?.replace(/_/g, ' ') ?? 'N/A'}</span>;
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  record,
  onClose,
  onSubmit,
}: {
  record: EvidencePackage;
  onClose: () => void;
  onSubmit: (status: ReviewStatus, notes: string) => void;
}) {
  const [action, setAction] = useState<ReviewStatus>('APPROVED');
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f1319] border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-md space-y-5 p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm">Supervisor Review</div>
            <div className="text-[10px] text-slate-500 font-mono">{record.testId}</div>
          </div>
        </div>

        {/* Record summary */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3 space-y-1.5 text-xs">
          {[
            ['Protocol', record.protocolId ?? 'N/A'],
            ['Result', record.resultLabel ?? record.result?.replace(/_/g, ' ') ?? 'N/A'],
            ['Confidence', `${record.confidence ?? 0}%`],
            ['Operator', record.operatorId ?? 'N/A'],
            ['Timestamp', new Date(record.timestamp ?? '').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-slate-500">{l}</span>
              <span className="text-slate-300 font-mono">{v}</span>
            </div>
          ))}
        </div>

        {/* Action selector */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Review Decision</div>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['APPROVED',  'Approve',  'emerald'],
              ['REJECTED',  'Reject',   'red'],
              ['ESCALATED', 'Escalate', 'purple'],
            ] as [ReviewStatus, string, string][]).map(([val, label, color]) => (
              <button
                key={val}
                onClick={() => setAction(val)}
                className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                  action === val
                    ? `bg-${color}-900/30 text-${color}-300 border-${color}-600/50`
                    : 'bg-slate-800/40 text-slate-500 border-slate-700/30 hover:border-slate-600/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes / Reason</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Enter review notes, reason for rejection, or escalation context…"
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-xs">Cancel</button>
          <button
            onClick={() => onSubmit(action, notes)}
            className="btn-primary text-xs"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ESCALATED';

export default function SupervisorReviewPage() {
  const { records, updateRecord, operator, user } = useApp();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<FilterTab>('PENDING_REVIEW');
  const [reviewingRecord, setReviewingRecord] = useState<EvidencePackage | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const isSupervisor = user?.role === 'SUPERVISOR' || user?.role === 'ADMIN';

  // Mark all SEALED records without reviewStatus as PENDING_REVIEW
  const enriched: EvidencePackage[] = records.map(r => ({
    ...r,
    reviewStatus: r.reviewStatus ?? (r.evidenceStatus === 'SEALED' ? 'PENDING_REVIEW' : undefined),
  }));

  const filtered = filter === 'all'
    ? enriched
    : enriched.filter(r => r.reviewStatus === filter);

  const stats = {
    pending:   enriched.filter(r => r.reviewStatus === 'PENDING_REVIEW').length,
    approved:  enriched.filter(r => r.reviewStatus === 'APPROVED').length,
    rejected:  enriched.filter(r => r.reviewStatus === 'REJECTED').length,
    escalated: enriched.filter(r => r.reviewStatus === 'ESCALATED').length,
  };

  const handleSubmitReview = (status: ReviewStatus, notes: string) => {
    if (!reviewingRecord) return;
    updateRecord(reviewingRecord.testId, {
      reviewStatus: status,
      reviewedBy: user?.operator_id ?? operator?.id ?? 'SUPERVISOR',
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes,
    });
    setReviewingRecord(null);
    setToast({ msg: `Record ${reviewingRecord.testId} marked as ${status}`, type: 'success' });
    setTimeout(() => setToast(null), 3500);
  };

  const TABS: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'PENDING_REVIEW', label: 'Pending', count: stats.pending },
    { id: 'APPROVED',       label: 'Approved', count: stats.approved },
    { id: 'REJECTED',       label: 'Rejected', count: stats.rejected },
    { id: 'ESCALATED',      label: 'Escalated', count: stats.escalated },
    { id: 'all',            label: 'All Records' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-xl border animate-fade-in ${
          toast.type === 'success'
            ? 'bg-emerald-900/90 text-emerald-300 border-emerald-700/40'
            : 'bg-red-900/90 text-red-300 border-red-700/40'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Review Modal */}
      {reviewingRecord && (
        <ReviewModal
          record={reviewingRecord}
          onClose={() => setReviewingRecord(null)}
          onSubmit={handleSubmitReview}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Supervisor Review</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review and approve field test results before chain-of-custody hand-off</p>
        </div>
        {!isSupervisor && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/10 border border-amber-700/20 text-xs text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Read-only (FIELD_OPERATOR role)
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pending Review', value: stats.pending,   color: 'amber'   },
          { label: 'Approved',       value: stats.approved,  color: 'emerald' },
          { label: 'Rejected',       value: stats.rejected,  color: 'red'     },
          { label: 'Escalated',      value: stats.escalated, color: 'purple'  },
        ].map(s => (
          <div key={s.label} className="panel-elevated p-4">
            <div className={`text-2xl font-bold font-mono text-${s.color}-400`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 bg-slate-900/50 rounded-lg p-1 overflow-x-auto w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0 ${
              filter === t.id
                ? 'bg-slate-700/70 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                filter === t.id ? 'bg-indigo-600/40 text-indigo-300' : 'bg-slate-700/40 text-slate-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <div className="panel-elevated p-10 text-center">
          <ClipboardCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <div className="text-slate-400 text-sm">No records in this category</div>
          <div className="text-slate-600 text-xs mt-1">
            {filter === 'PENDING_REVIEW'
              ? 'All field test records have been reviewed.'
              : 'No records match the selected filter.'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(record => (
            <div
              key={record.testId}
              className="panel-elevated p-4 hover:border-slate-600/40 transition-all border border-slate-700/30"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: test info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-slate-200">{record.testId}</span>
                    {reviewBadge(record.reviewStatus)}
                    {resultBadge(record.result)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                    {[
                      [<FlaskConical className="w-3 h-3 text-slate-600" />, record.protocolId ?? 'N/A'],
                      [<User className="w-3 h-3 text-slate-600" />, record.operatorId ?? 'N/A'],
                      [<Shield className="w-3 h-3 text-slate-600" />, `${record.confidence ?? 0}% confidence`],
                      [<Clock className="w-3 h-3 text-slate-600" />, new Date(record.timestamp ?? '').toLocaleDateString('en-IN')],
                    ].map(([icon, text], i) => (
                      <div key={i} className="flex items-center gap-1.5 text-slate-500">
                        {icon}
                        <span className="truncate">{text as string}</span>
                      </div>
                    ))}
                  </div>

                  {/* Reviewer info if already reviewed */}
                  {record.reviewedBy && (
                    <div className="text-[11px] text-slate-600">
                      Reviewed by <span className="text-slate-400">{record.reviewedBy}</span>
                      {record.reviewedAt && ` · ${new Date(record.reviewedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
                      {record.reviewNotes && ` · "${record.reviewNotes}"`}
                    </div>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/test/${record.testId}`)}
                    className="btn-secondary text-xs py-1"
                  >
                    View <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => generateEvidencePDF(record)}
                    className="btn-secondary text-xs py-1"
                  >
                    <Download className="w-3 h-3" /> PDF
                  </button>
                  {isSupervisor && (
                    <button
                      onClick={() => setReviewingRecord(record)}
                      className="btn-primary text-xs py-1"
                    >
                      <ClipboardCheck className="w-3 h-3" /> Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role note */}
      {!isSupervisor && records.length > 0 && (
        <div className="panel-elevated p-4 border border-slate-700/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-slate-200 mb-1">Supervisor Access Required</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Only users with SUPERVISOR or ADMIN role can approve, reject, or escalate records.
                Your current role is <span className="text-amber-400 font-mono">{user?.role ?? 'FIELD_OPERATOR'}</span>.
                Contact your supervising officer to review these records.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
