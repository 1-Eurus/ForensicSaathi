import React from 'react';

interface ProgressBarProps {
  value: number; // 0–100
  color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'violet';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  animate?: boolean;
  label?: string;
}

const COLORS = {
  indigo:  'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  violet:  'bg-violet-500',
};

const HEIGHTS = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' };

export function ProgressBar({ value, color = 'indigo', size = 'md', showValue, animate, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showValue && <span className="text-xs font-mono text-slate-300">{pct}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-800 rounded-full overflow-hidden ${HEIGHTS[size]}`}>
        <div
          className={`${HEIGHTS[size]} rounded-full transition-all duration-700 ${COLORS[color]} ${animate ? 'shimmer' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 85 ? 'emerald' : score >= 70 ? 'amber' : 'red';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-36 flex-shrink-0">{label}</span>
      <div className="flex-1">
        <ProgressBar value={score} color={color} size="sm" />
      </div>
      <span className={`text-xs font-mono w-7 text-right ${
        color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-red-400'
      }`}>{score}</span>
    </div>
  );
}
