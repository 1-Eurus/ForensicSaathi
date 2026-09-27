import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { CalibrationResult } from '../../types';
import { ProgressBar } from '../ui/ProgressBar';

export function CalibrationPanel({ result }: { result: CalibrationResult }) {
  const statusIcon = result.status === 'PASSED'
    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    : result.status === 'FAILED'
    ? <XCircle className="w-4 h-4 text-red-400" />
    : <AlertTriangle className="w-4 h-4 text-amber-400" />;

  const statusColor = result.status === 'PASSED' ? 'emerald' : result.status === 'FAILED' ? 'red' : 'amber';
  const devScore = Math.max(0, 100 - result.overallDeviation * 4);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className={`text-sm font-semibold ${
            result.status === 'PASSED' ? 'text-emerald-300'
            : result.status === 'FAILED' ? 'text-red-300'
            : 'text-amber-300'
          }`}>
            Calibration {result.status}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Overall Quality</div>
          <div className={`text-sm font-bold font-mono ${
            result.qualityLabel === 'GOOD' ? 'text-emerald-400' : 'text-amber-400'
          }`}>{result.qualityLabel}</div>
        </div>
      </div>

      {/* Deviation score */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">Colour Accuracy</span>
          <span className="text-xs font-mono text-slate-300">
            Avg. deviation: {result.overallDeviation} ΔE
          </span>
        </div>
        <ProgressBar value={devScore} color={statusColor as any} size="lg" />
      </div>

      {/* Message */}
      <div className={`text-xs p-3 rounded-lg border ${
        result.status === 'PASSED'
          ? 'bg-emerald-900/10 border-emerald-700/20 text-emerald-300'
          : result.status === 'POOR'
          ? 'bg-amber-900/10 border-amber-700/20 text-amber-300'
          : 'bg-red-900/10 border-red-700/20 text-red-300'
      }`}>
        {result.message}
      </div>

      {/* Reference patches */}
      {result.patches.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Reference Patches</div>
          {result.patches.map((patch) => (
            <div key={patch.patchId}
              className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-800/30 border border-slate-700/30"
            >
              <div className="flex-shrink-0 text-xs text-slate-600 font-mono w-4">{patch.patchId.replace('P', '')}</div>
              {/* Expected colour swatch */}
              <div
                className="w-5 h-5 rounded border border-slate-600/50 flex-shrink-0"
                style={{ backgroundColor: patch.expectedHex }}
                title={`Expected: ${patch.expectedHex}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-slate-400 truncate">{patch.label}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-slate-600">E: {patch.expectedHex}</span>
                  <span className="text-[10px] text-slate-700">→</span>
                  <span className="text-[10px] font-mono text-slate-500">C: {patch.capturedHex}</span>
                </div>
              </div>
              {/* Captured colour swatch */}
              <div
                className="w-5 h-5 rounded border border-slate-600/50 flex-shrink-0"
                style={{ backgroundColor: patch.capturedHex }}
                title={`Captured: ${patch.capturedHex}`}
              />
              <div className={`text-xs font-mono flex-shrink-0 w-12 text-right ${
                patch.deviation < 10 ? 'text-emerald-400' : patch.deviation < 20 ? 'text-amber-400' : 'text-red-400'
              }`}>
                Δ {patch.deviation}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
