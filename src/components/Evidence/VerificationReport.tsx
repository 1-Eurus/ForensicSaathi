import React from 'react';
import { ShieldCheck, ShieldAlert, Check, X, Loader2 } from 'lucide-react';
import type { VerificationReport } from '../../types';
import { HashRow } from '../ui/HashDisplay';
import { format } from 'date-fns';

export function VerificationReportView({ report, loading = false }: {
  report: VerificationReport | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="w-8 h-8 text-indigo-400 spinner" />
        <div className="text-sm text-slate-400">Recomputing cryptographic hashes…</div>
        <div className="text-xs text-slate-600 font-mono">SHA-256 verification in progress</div>
      </div>
    );
  }

  if (!report) return null;

  const passed = report.overallStatus === 'VERIFIED';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Big result */}
      <div className={`rounded-xl p-6 border text-center ${
        passed
          ? 'bg-emerald-900/10 border-emerald-600/30'
          : 'bg-red-900/10 border-red-600/40 border-glow-red'
      }`}>
        <div className="flex justify-center mb-3">
          {passed
            ? <ShieldCheck className="w-12 h-12 text-emerald-400" />
            : <ShieldAlert className="w-12 h-12 text-red-400" />
          }
        </div>
        <div className={`text-2xl font-bold font-mono ${passed ? 'text-emerald-300' : 'text-red-300'}`}>
          {passed ? '✓ ORIGINAL EVIDENCE VERIFIED' : '⚠ INTEGRITY CHECK FAILED'}
        </div>
        {!passed && report.tamperDetails && (
          <div className="mt-3 text-sm text-red-400/80 max-w-sm mx-auto">
            "{report.tamperDetails}"
          </div>
        )}
        {passed && (
          <div className="mt-2 text-sm text-emerald-400/70">
            All cryptographic checks passed — record is unaltered
          </div>
        )}
      </div>

      {/* Individual checks */}
      <div className="space-y-2">
        {report.checks.map(check => (
          <div
            key={check.label}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              check.passed
                ? 'bg-emerald-900/10 border-emerald-700/20'
                : 'bg-red-900/10 border-red-700/20'
            }`}
          >
            {check.passed
              ? <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              : <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            }
            <div>
              <div className={`text-sm font-medium ${check.passed ? 'text-emerald-300' : 'text-red-300'}`}>
                {check.passed ? '✓' : '✗'} {check.label.toUpperCase()} {check.passed ? 'MATCH' : 'MISMATCH'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{check.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Hash comparison */}
      <div className="glass-panel p-4 space-y-1">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Hash Comparison (SHA-256)</div>
        <HashRow label="Stored hash"   hash={report.storedHash}   match={report.evidenceHashMatch} />
        <HashRow label="Computed hash" hash={report.computedHash} match={report.evidenceHashMatch} />
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Test ID: {report.testId}</span>
        <span>Verified: {format(new Date(report.verifiedAt), 'dd MMM yyyy HH:mm:ss')}</span>
        <span>By: {report.verifiedBy}</span>
      </div>
    </div>
  );
}
