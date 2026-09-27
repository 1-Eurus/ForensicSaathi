import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import type { EvidencePackage } from '../../types';
import { Badge, resultBadgeVariant, verificationBadgeVariant, evidenceStatusVariant } from '../ui/Badge';
import { format } from 'date-fns';

const RESULT_LABEL: Record<string, string> = {
  PRESUMPTIVE_POSITIVE: 'Pres. Positive',
  PRESUMPTIVE_NEGATIVE: 'Pres. Negative',
  INCONCLUSIVE:         'Inconclusive',
  REPEAT_TEST_RECOMMENDED: 'Repeat Rec.',
  CALIBRATION_FAILED:   'Calib. Failed',
  QUALITY_INSUFFICIENT: 'Quality Fail',
};

export function RecentTestsTable({ records }: { records: EvidencePackage[] }) {
  const navigate = useNavigate();

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-200">Recent Field Tests</span>
        </div>
        <div className="text-xs text-slate-500">{records.length} records</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800/60">
              {['Test ID', 'Time', 'Operator', 'Protocol', 'Result', 'Confidence', 'Evidence', 'Verification'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 12).map((r, i) => (
              <tr
                key={r.testId}
                onClick={() => navigate(`/test/${r.testId}`)}
                className={`border-b border-slate-800/30 cursor-pointer transition-all duration-100
                  hover:bg-slate-700/20 group ${i % 2 === 0 ? '' : 'bg-slate-900/10'}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-300 group-hover:text-indigo-200">{r.testId}</span>
                    <ExternalLink className="w-3 h-3 text-slate-700 group-hover:text-slate-500" />
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-slate-400">
                  {format(new Date(r.timestamp), 'HH:mm')}
                </td>
                <td className="px-4 py-3 font-mono text-slate-400">{r.operatorId}</td>
                <td className="px-4 py-3 text-slate-400">{r.protocolName.replace('Demo Colorimetric ', '')}</td>
                <td className="px-4 py-3">
                  <Badge variant={resultBadgeVariant(r.result)}>
                    {RESULT_LABEL[r.result] ?? r.resultLabel}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.confidence >= 80 ? 'bg-emerald-500' : r.confidence >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${r.confidence}%` }}
                      />
                    </div>
                    <span className="font-mono text-slate-300">{r.confidence}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={evidenceStatusVariant(r.evidenceStatus)}>
                    {r.evidenceStatus}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {r.verificationStatus === 'VERIFIED'
                      ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      : r.verificationStatus === 'FAILED'
                      ? <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      : <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                    }
                    <Badge variant={verificationBadgeVariant(r.verificationStatus)}>
                      {r.verificationStatus}
                    </Badge>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {records.length === 0 && (
        <div className="py-12 text-center text-slate-600 text-sm">
          No test records found
        </div>
      )}
    </div>
  );
}
