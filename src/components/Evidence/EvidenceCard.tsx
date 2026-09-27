import React from 'react';
import { Shield, ShieldCheck, ShieldAlert, Lock, AlertTriangle } from 'lucide-react';
import type { EvidencePackage } from '../../types';
import { HashDisplay } from '../ui/HashDisplay';
import { format } from 'date-fns';

const RESULT_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  PRESUMPTIVE_POSITIVE: {
    bg: 'bg-violet-900/20', border: 'border-violet-600/40', text: 'text-violet-300',
    label: 'Presumptive Positive',
  },
  PRESUMPTIVE_NEGATIVE: {
    bg: 'bg-emerald-900/20', border: 'border-emerald-600/40', text: 'text-emerald-300',
    label: 'Presumptive Negative',
  },
  INCONCLUSIVE: {
    bg: 'bg-amber-900/20', border: 'border-amber-600/40', text: 'text-amber-300',
    label: 'Inconclusive',
  },
  CALIBRATION_FAILED: {
    bg: 'bg-red-900/20', border: 'border-red-600/40', text: 'text-red-300',
    label: 'Calibration Failed',
  },
};

interface EvidenceCardProps {
  evidence: EvidencePackage;
  compact?: boolean;
}

export function EvidenceCard({ evidence, compact = false }: EvidenceCardProps) {
  const style = RESULT_STYLES[evidence.result] ?? RESULT_STYLES['INCONCLUSIVE'];
  const isSealed = evidence.evidenceStatus === 'SEALED';

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden shadow-xl`}>
      {/* Header band */}
      <div className={`flex items-center justify-between px-5 py-3 bg-black/20 border-b ${style.border}`}>
        <div className="flex items-center gap-2">
          {isSealed
            ? <Lock className="w-4 h-4 text-indigo-400" />
            : <AlertTriangle className="w-4 h-4 text-amber-400" />
          }
          <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
            Field Evidence Package
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
          isSealed ? 'text-indigo-300 border-indigo-600/40 bg-indigo-900/20' : 'text-amber-300 border-amber-600/40 bg-amber-900/20'
        }`}>
          {isSealed ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
          {evidence.evidenceStatus}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Result — big */}
        <div className="text-center py-3">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Presumptive Result</div>
          <div className={`text-2xl font-bold ${style.text}`}>{style.label}</div>
          <div className="text-xs text-amber-400/70 mt-1">
            ⚠ NOT a laboratory confirmation
          </div>
        </div>

        {/* Grid of fields */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Test ID"    value={evidence.testId}         mono />
          <Field label="Timestamp"  value={evidence.timestampIST}   mono />
          <Field label="Operator"   value={evidence.operatorId}     mono />
          <Field label="Location"   value={evidence.location}            />
          <Field label="Protocol"   value={evidence.protocolId}     mono />
          <Field label="Device"     value={evidence.deviceId}       mono />
        </div>

        {/* Scores row */}
        <div className="grid grid-cols-3 gap-3">
          <ScoreField
            label="Confidence"
            value={`${evidence.confidence}%`}
            color={evidence.confidence >= 80 ? 'text-emerald-400' : evidence.confidence >= 60 ? 'text-amber-400' : 'text-red-400'}
          />
          <ScoreField
            label="Evidence Quality"
            value={evidence.imageQualityScore >= 85 ? 'HIGH' : evidence.imageQualityScore >= 70 ? 'MEDIUM' : 'LOW'}
            color={evidence.imageQualityScore >= 85 ? 'text-emerald-400' : evidence.imageQualityScore >= 70 ? 'text-amber-400' : 'text-red-400'}
          />
          <ScoreField
            label="Calibration"
            value={evidence.calibrationStatus}
            color={evidence.calibrationStatus === 'PASSED' ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>

        {/* Hash */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider">SHA-256 Evidence Hash</div>
          <div className="bg-black/30 rounded-lg p-2.5 border border-slate-700/30">
            <HashDisplay hash={evidence.evidenceHash} short className="justify-start" />
          </div>
        </div>

        {/* Image integrity */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
          evidence.verificationStatus === 'VERIFIED'
            ? 'bg-emerald-900/10 border-emerald-700/20 text-emerald-300'
            : 'bg-slate-800/30 border-slate-700/20 text-slate-400'
        }`}>
          {evidence.verificationStatus === 'VERIFIED'
            ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            : <Shield className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
          }
          Image Integrity: {evidence.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'NOT YET VERIFIED'}
        </div>

        {/* Disclaimer */}
        {!compact && (
          <div className="text-[10px] text-slate-600 border-t border-slate-700/30 pt-3 leading-relaxed">
            {evidence.disclaimer}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</div>
      <div className={`text-sm text-slate-200 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function ScoreField({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center bg-black/20 rounded-lg py-3 px-2 border border-slate-700/20">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-base font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}
