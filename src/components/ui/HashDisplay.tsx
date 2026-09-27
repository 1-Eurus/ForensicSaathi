import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface HashDisplayProps {
  hash: string;
  label?: string;
  short?: boolean;
  className?: string;
}

export function HashDisplay({ hash, label, short = false, className = '' }: HashDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const display = short
    ? `${hash.slice(0, 8)}...${hash.slice(-4)}`
    : hash;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="text-xs text-slate-500 font-mono flex-shrink-0">{label}</span>}
      <div className="flex items-center gap-1.5 bg-slate-900/60 rounded px-2 py-1 border border-slate-700/40 min-w-0">
        <span className="text-xs font-mono text-slate-300 truncate">{display}</span>
        <button
          onClick={copy}
          className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
        >
          {copied
            ? <Check className="w-3 h-3 text-emerald-400" />
            : <Copy className="w-3 h-3" />
          }
        </button>
      </div>
    </div>
  );
}

export function HashRow({ label, hash, match }: { label: string; hash: string; match?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
      <span className="text-xs text-slate-500 w-32 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-mono text-slate-300 truncate">
          {hash.slice(0, 16)}...{hash.slice(-8)}
        </span>
        {match !== undefined && (
          <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
            match
              ? 'text-emerald-400 bg-emerald-900/20'
              : 'text-red-400 bg-red-900/20'
          }`}>
            {match ? '✓ MATCH' : '✗ MISMATCH'}
          </span>
        )}
      </div>
    </div>
  );
}
