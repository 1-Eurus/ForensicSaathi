import React from 'react';
import { Check, AlertCircle, Loader2, Circle, ChevronRight } from 'lucide-react';
import type { CVPipelineStep } from '../../types';

const STEP_ICONS = {
  pending: <Circle className="w-4 h-4 text-slate-700" />,
  running: <Loader2 className="w-4 h-4 text-blue-400 spinner" />,
  done:    <Check className="w-4 h-4 text-emerald-400" />,
  failed:  <AlertCircle className="w-4 h-4 text-red-400" />,
  skipped: <ChevronRight className="w-4 h-4 text-slate-600" />,
};

const STEP_CLASSES = {
  pending: 'pipeline-step pipeline-step-pending',
  running: 'pipeline-step pipeline-step-active',
  done:    'pipeline-step pipeline-step-done',
  failed:  'pipeline-step pipeline-step-failed',
  skipped: 'pipeline-step pipeline-step-pending opacity-50',
};

export function PipelineProgress({ steps }: { steps: CVPipelineStep[] }) {
  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => (
        <div key={step.id} className="relative">
          <div className={STEP_CLASSES[step.status]}>
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {STEP_ICONS[step.status]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{step.label}</span>
                {step.status === 'done' && step.durationMs && (
                  <span className="text-[11px] font-mono text-slate-600">{step.durationMs}ms</span>
                )}
              </div>
              {step.status === 'running' && (
                <div className="text-[11px] text-blue-400/70 mt-0.5">{step.description}</div>
              )}
              {step.status === 'done' && step.detail && (
                <div className="text-[11px] text-slate-500 mt-0.5">{step.detail}</div>
              )}
              {step.status === 'failed' && step.detail && (
                <div className="text-[11px] text-red-400/80 mt-0.5">{step.detail}</div>
              )}
            </div>
          </div>
          {/* Connector line */}
          {i < steps.length - 1 && (
            <div className="ml-[18px] w-px h-2 bg-slate-800/60" />
          )}
        </div>
      ))}
    </div>
  );
}

export function PipelineStageLabel({ stage }: { stage: string }) {
  const LABELS: Record<string, string> = {
    capture: 'CAPTURING',
    calibrating: 'CALIBRATING',
    analysing: 'ANALYSING',
    validating: 'VALIDATING',
    generating: 'GENERATING EVIDENCE',
    complete: 'COMPLETE',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
      <span className="text-xs font-mono font-semibold tracking-widest text-blue-300 uppercase">
        {LABELS[stage] ?? stage.toUpperCase()}
      </span>
    </div>
  );
}
