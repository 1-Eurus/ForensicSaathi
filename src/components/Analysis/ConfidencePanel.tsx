import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { ConfidenceBreakdown } from '../../types';
import { ProgressBar } from '../ui/ProgressBar';

export function ConfidencePanel({ breakdown }: { breakdown: ConfidenceBreakdown }) {
  const [expanded, setExpanded] = useState(false);

  const color = breakdown.overall >= 80 ? 'emerald' : breakdown.overall >= 60 ? 'amber' : 'red';

  const factors = [
    { label: 'Colour Match',        value: breakdown.colorMatch,            color: 'indigo' },
    { label: 'Calibration Quality', value: breakdown.calibrationQuality,    color: 'indigo' },
    { label: 'Image Quality',       value: breakdown.imageQuality,          color: 'indigo' },
    { label: 'Region Detection',    value: breakdown.regionDetection,       color: 'indigo' },
    { label: 'Reference Card',      value: breakdown.referenceCardConfidence, color: 'indigo' },
  ] as const;

  return (
    <div className="space-y-3">
      {/* Overall confidence */}
      <div className="flex items-end justify-between">
        <div>
          <div className="field-label">Overall Confidence</div>
          <div className={`text-4xl font-bold font-mono mt-1 ${
            color === 'emerald' ? 'text-emerald-400'
            : color === 'amber' ? 'text-amber-400'
            : 'text-red-400'
          }`}>
            {breakdown.overall}%
          </div>
        </div>
      </div>

      {/* Overall bar */}
      <ProgressBar value={breakdown.overall} color={color} size="lg" />

      {/* Factor breakdown */}
      <div className="space-y-2 pt-1">
        {factors.map(f => (
          <div key={f.label} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-36 flex-shrink-0">{f.label}</span>
            <div className="flex-1">
              <ProgressBar value={f.value} color="indigo" size="sm" />
            </div>
            <span className="text-xs font-mono text-slate-300 w-8 text-right">{f.value}%</span>
          </div>
        ))}
      </div>

      {/* Expandable explanation */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
        <span>Why this confidence?</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="text-xs text-slate-400 bg-slate-800/30 rounded-lg p-3 border border-slate-700/30 leading-relaxed">
          {breakdown.explanation}
          <div className="mt-2 pt-2 border-t border-slate-700/30 text-slate-500">
            Confidence is computed as a weighted average: Colour Match (35%) + Calibration Quality (25%) +
            Image Quality (20%) + Region Detection (12%) + Reference Card (8%).
            Confidence above 80% is considered reliable for field assessment.
          </div>
        </div>
      )}
    </div>
  );
}
