import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { ImageQualityMetrics } from '../../types';
import { ScoreBar } from '../ui/ProgressBar';

export function ImageQualityPanel({ metrics }: { metrics: ImageQualityMetrics }) {
  const StatusIcon = metrics.status === 'ACCEPTABLE'
    ? CheckCircle2
    : metrics.status === 'MARGINAL'
    ? AlertTriangle
    : XCircle;

  const iconColor = metrics.status === 'ACCEPTABLE'
    ? 'text-emerald-400'
    : metrics.status === 'MARGINAL'
    ? 'text-amber-400'
    : 'text-red-400';

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-semibold text-slate-200">Image Quality</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-slate-100">{metrics.overallScore}</div>
          <div className="text-[11px] text-slate-500">/ 100</div>
        </div>
      </div>

      {/* Status message */}
      <div className={`text-xs p-3 rounded-lg border ${
        metrics.status === 'ACCEPTABLE'
          ? 'bg-emerald-900/10 border-emerald-700/20 text-emerald-300'
          : metrics.status === 'MARGINAL'
          ? 'bg-amber-900/10 border-amber-700/20 text-amber-300'
          : 'bg-red-900/10 border-red-700/20 text-red-300'
      }`}>
        {metrics.message}
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2.5">
        <ScoreBar score={metrics.sharpness}           label="Sharpness" />
        <ScoreBar score={metrics.brightness}          label="Lighting" />
        <ScoreBar score={metrics.contrast}            label="Contrast" />
        <ScoreBar score={metrics.referenceVisibility} label="Reference Visibility" />
        <ScoreBar score={metrics.testRegionVisibility}label="Test Region Visibility" />
        <ScoreBar score={metrics.alignment}           label="Alignment" />
        <ScoreBar score={metrics.glare}               label="Glare Control" />
      </div>
    </div>
  );
}
