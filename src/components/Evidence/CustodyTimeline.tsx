/**
 * ForensicSaathi — Chain of Custody Timeline Component
 * Renders a chronological, color-coded custody event timeline
 */
import React from 'react';
import {
  Package, ArrowRightLeft, FlaskConical, Archive,
  ShieldCheck, ClipboardCheck, Trash2, Clock
} from 'lucide-react';
import type { CustodyEvent } from '../../types';

const CATEGORY_CONFIG: Record<CustodyEvent['category'], {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  COLLECTION:   { icon: Package,        color: 'text-blue-400',   bg: 'bg-blue-900/20',   border: 'border-blue-700/30',   label: 'Collection'   },
  TRANSFER:     { icon: ArrowRightLeft, color: 'text-amber-400',  bg: 'bg-amber-900/20',  border: 'border-amber-700/30',  label: 'Transfer'     },
  ANALYSIS:     { icon: FlaskConical,   color: 'text-violet-400', bg: 'bg-violet-900/20', border: 'border-violet-700/30', label: 'Analysis'     },
  STORAGE:      { icon: Archive,        color: 'text-slate-400',  bg: 'bg-slate-800/40',  border: 'border-slate-700/30',  label: 'Storage'      },
  VERIFICATION: { icon: ShieldCheck,    color: 'text-emerald-400',bg: 'bg-emerald-900/20',border: 'border-emerald-700/30',label: 'Verification' },
  REVIEW:       { icon: ClipboardCheck, color: 'text-indigo-400', bg: 'bg-indigo-900/20', border: 'border-indigo-700/30', label: 'Review'       },
  DISPOSAL:     { icon: Trash2,         color: 'text-red-400',    bg: 'bg-red-900/20',    border: 'border-red-700/30',    label: 'Disposal'     },
};

interface CustodyTimelineProps {
  events: CustodyEvent[];
  compact?: boolean;
}

export function CustodyTimeline({ events, compact = false }: CustodyTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <div className="text-sm text-slate-500">No custody events recorded</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-700/40" />

      <div className="space-y-4">
        {events.map((event, idx) => {
          const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.STORAGE;
          const Icon = cfg.icon;
          const isLast = idx === events.length - 1;

          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon dot */}
              <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>

              {/* Content */}
              <div className={`flex-1 ${compact ? 'py-1' : 'py-1.5'} ${!isLast ? 'pb-4' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{event.action}</div>
                    {!compact && (
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          <span className="text-slate-400">{event.actor}</span>
                          {event.role && <span className="text-slate-600"> · {event.role}</span>}
                        </span>
                        {event.location && (
                          <span className="text-xs text-slate-600">📍 {event.location}</span>
                        )}
                      </div>
                    )}
                    {event.notes && (
                      <div className="text-xs text-slate-500 mt-1 italic">"{event.notes}"</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-600 flex-shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(event.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
