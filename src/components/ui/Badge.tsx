import React from 'react';

type Variant = 'positive' | 'negative' | 'inconclusive' | 'sealed' | 'warning' | 'neutral' | 'info' | 'failed';

const VARIANTS: Record<Variant, string> = {
  positive:     'text-violet-300 bg-violet-900/25 border border-violet-700/30',
  negative:     'text-emerald-300 bg-emerald-900/20 border border-emerald-700/30',
  inconclusive: 'text-amber-300 bg-amber-900/20 border border-amber-700/30',
  sealed:       'text-indigo-300 bg-indigo-900/20 border border-indigo-700/30',
  warning:      'text-amber-400 bg-amber-900/20 border border-amber-700/30',
  neutral:      'text-slate-400 bg-slate-800/40 border border-slate-700/30',
  info:         'text-blue-300 bg-blue-900/20 border border-blue-700/30',
  failed:       'text-red-300 bg-red-900/20 border border-red-700/30',
};

export function Badge({ variant = 'neutral', children, className = '' }: {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium font-mono ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function resultBadgeVariant(result: string): Variant {
  if (result.includes('POSITIVE')) return 'positive';
  if (result.includes('NEGATIVE')) return 'negative';
  if (result === 'INCONCLUSIVE') return 'inconclusive';
  if (result === 'CALIBRATION_FAILED') return 'failed';
  return 'warning';
}

export function verificationBadgeVariant(status: string): Variant {
  if (status === 'VERIFIED') return 'negative';
  if (status === 'FAILED') return 'failed';
  if (status === 'UNVERIFIED') return 'neutral';
  return 'warning';
}

export function evidenceStatusVariant(status: string): Variant {
  if (status === 'SEALED') return 'sealed';
  if (status === 'TAMPERED') return 'failed';
  if (status === 'DRAFT') return 'warning';
  return 'neutral';
}
