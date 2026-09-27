import React from 'react';
import { Shield, User, Settings, AlertTriangle } from 'lucide-react';
import type { AuditEvent } from '../../types';
import { format } from 'date-fns';

const CATEGORY_STYLES: Record<AuditEvent['category'], { icon: React.ReactNode; dot: string }> = {
  SYSTEM:       { icon: <Settings className="w-3 h-3" />,      dot: 'bg-blue-400' },
  OPERATOR:     { icon: <User className="w-3 h-3" />,          dot: 'bg-indigo-400' },
  VERIFICATION: { icon: <Shield className="w-3 h-3" />,        dot: 'bg-emerald-400' },
  INTEGRITY:    { icon: <AlertTriangle className="w-3 h-3" />, dot: 'bg-amber-400' },
};

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <div className="space-y-0">
      {events.map((ev, i) => {
        const style = CATEGORY_STYLES[ev.category];
        return (
          <div key={ev.id} className="flex gap-3 relative">
            {/* Timeline line */}
            {i < events.length - 1 && (
              <div className="absolute left-[19px] top-6 bottom-0 w-px bg-slate-800" />
            )}

            {/* Dot */}
            <div className="flex-shrink-0 mt-1.5">
              <div className={`w-5 h-5 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-400`}>
                <div className="text-[9px]">{style.icon}</div>
              </div>
            </div>

            {/* Content */}
            <div className="pb-4 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm text-slate-300">{ev.event}</span>
                  {ev.detail && (
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">{ev.detail}</div>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs font-mono text-slate-500">
                    {format(new Date(ev.timestamp), 'HH:mm:ss')}
                  </div>
                  <div className="text-[10px] text-slate-600">{ev.actor}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
