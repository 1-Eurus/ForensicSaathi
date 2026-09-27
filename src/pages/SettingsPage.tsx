import React, { useState } from 'react';
import { Settings, FlaskConical, ChevronDown, ChevronUp, Info, Shield, Lock, Database, Key, Eye, Fingerprint, MapPin, FileText } from 'lucide-react';
import { PROTOCOLS } from '../data/protocols';
import { useApp } from '../context/AppContext';

export default function SettingsPage() {
  const { operator } = useApp();
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(PROTOCOLS[0].id);

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Settings &amp; Test Protocols</h1>
        <p className="text-sm text-slate-500 mt-0.5">System configuration and protocol reference</p>
      </div>

      {/* System info */}
      <div className="panel-elevated p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-200">System Information</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Version', value: 'ForensicSaathi v1.0.0' },
            { label: 'Problem Statement', value: 'PS-26231' },
            { label: 'Hackathon', value: 'SIH 2026' },
            { label: 'Hash Algorithm', value: 'SHA-256 (Web Crypto API)' },
            { label: 'Operator', value: operator?.id ?? '—' },
            { label: 'Session', value: operator?.sessionId ?? '—' },
            { label: 'Device', value: operator?.deviceId ?? '—' },
            { label: 'Mode', value: 'Demo / Prototype' },
            { label: 'Disclaimer', value: 'Presumptive results only' },
          ].map(f => (
            <div key={f.label} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/20">
              <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">{f.label}</div>
              <div className="text-xs text-slate-300 font-mono leading-relaxed">{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Protocols */}
      <div className="mb-4 flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-slate-200">Test Protocols</h2>
        <span className="text-xs text-slate-600">({PROTOCOLS.length} configured)</span>
      </div>

      <div className="space-y-3">
        {PROTOCOLS.map(p => {
          const expanded = expandedProtocol === p.id;
          return (
            <div key={p.id} className="panel-elevated overflow-hidden">
              <button
                onClick={() => setExpandedProtocol(expanded ? null : p.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{
                    backgroundColor: p.referenceRanges?.[0]?.colorHex ?? '#6366f1'
                  }} />
                  <div>
                    <div className="text-sm font-medium text-slate-200">{p.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{p.id} · {p.reactionType}</div>
                  </div>
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {expanded && (
                <div className="px-5 pb-5 border-t border-slate-700/30 pt-4 space-y-5">
                  {/* Description + basic info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-slate-600 uppercase mb-1">Description</div>
                      <div className="text-xs text-slate-400 leading-relaxed">{p.description}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 uppercase mb-1">Expected Colour Range</div>
                      <div className="text-xs text-slate-400 leading-relaxed">{p.expectedColorRange}</div>
                    </div>
                  </div>

                  {/* Recommended conditions */}
                  <div>
                    <div className="text-[10px] text-slate-600 uppercase mb-2">Recommended Conditions</div>
                    <ul className="space-y-1">
                      {p.recommendedConditions.map((c, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-slate-600" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Calibration patches */}
                  <div>
                    <div className="text-[10px] text-slate-600 uppercase mb-3">
                      Calibration Patches ({p.calibrationPatches.length})
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {p.calibrationPatches.map((patch, i) => (
                        <div key={i} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/20">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded" style={{ backgroundColor: patch.expectedHex }} />
                            <div className="text-[10px] font-mono text-slate-400">{patch.expectedHex}</div>
                          </div>
                          <div className="text-[10px] text-slate-600">{patch.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Colour ranges */}
                  {p.referenceRanges && p.referenceRanges.length > 0 && (
                    <div>
                      <div className="text-[10px] text-slate-600 uppercase mb-3">Reference Ranges</div>
                      <div className="space-y-2">
                        {p.referenceRanges.map((range, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/20">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: range.colorHex }} />
                              <span className="text-xs text-slate-400 font-mono">{range.colorDescription}</span>
                            </div>
                            <span className="text-[10px] text-slate-600">ΔE: {range.minDistance}–{range.maxDistance}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-900/10 border border-amber-700/20">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400/70 leading-relaxed">
          All protocols produce <strong>presumptive</strong> results only. Colorimetric field testing is subject to
          interferences from adulterants, environmental conditions, and operator variance. Laboratory confirmation
          by GC-MS or equivalent is required before any enforcement action is taken.
        </p>
      </div>

      {/* Privacy & Security section */}
      <PrivacySecuritySection />
    </div>
  );
}

function PrivacySecuritySection() {
  const { user, operator } = useApp();

  const securityItems = [
    {
      icon: <Lock className="w-4 h-4 text-emerald-400" />,
      title: 'Password Storage',
      description: 'All passwords are hashed with bcryptjs using 12 salt rounds before storage. Plaintext passwords are never stored, logged, or transmitted.',
      badge: 'bcryptjs · 12 rounds',
      badgeColor: 'text-emerald-400 bg-emerald-900/20 border-emerald-700/20',
    },
    {
      icon: <Key className="w-4 h-4 text-indigo-400" />,
      title: 'Session Management',
      description: 'Sessions use JSON Web Tokens (JWT) signed with a server secret. Tokens expire automatically after 8 hours. Tokens are stored in localStorage under "fp_token".',
      badge: 'JWT · HS256 · 8 h TTL',
      badgeColor: 'text-indigo-400 bg-indigo-900/20 border-indigo-700/20',
    },
    {
      icon: <Fingerprint className="w-4 h-4 text-purple-400" />,
      title: 'Evidence Hashing',
      description: 'Each test generates two SHA-256 hashes — one for the test sample image and one for the reference card image — combined into a single tamper-evident evidence seal using the Web Crypto API.',
      badge: 'SHA-256 · Web Crypto API',
      badgeColor: 'text-purple-400 bg-purple-900/20 border-purple-700/20',
    },
    {
      icon: <Database className="w-4 h-4 text-blue-400" />,
      title: 'Data Persistence',
      description: 'All test records and audit events are stored in a SQLite database (better-sqlite3) using WAL journal mode. Data survives page refreshes and server restarts.',
      badge: 'SQLite · WAL mode',
      badgeColor: 'text-blue-400 bg-blue-900/20 border-blue-700/20',
    },
    {
      icon: <MapPin className="w-4 h-4 text-cyan-400" />,
      title: 'Location (GPS)',
      description: 'GPS coordinates are captured using the browser Geolocation API with explicit permission. If permission is denied or unavailable, the system uses a fallback coordinate and labels it "SIMULATED LOCATION" in the evidence package.',
      badge: 'navigator.geolocation',
      badgeColor: 'text-cyan-400 bg-cyan-900/20 border-cyan-700/20',
    },
    {
      icon: <Eye className="w-4 h-4 text-amber-400" />,
      title: 'Login Security',
      description: 'The login endpoint always runs bcrypt.compare even for unknown usernames to prevent timing-based credential enumeration. All failed login attempts return the same error: "Invalid username or password."',
      badge: 'Timing-safe · No enumeration',
      badgeColor: 'text-amber-400 bg-amber-900/20 border-amber-700/20',
    },
    {
      icon: <FileText className="w-4 h-4 text-rose-400" />,
      title: 'Audit Trail',
      description: 'Every significant action — logins, test creations, evidence seals, verification checks — is appended to an immutable audit log in the database. Audit records are never modified or deleted.',
      badge: 'Immutable · Append-only',
      badgeColor: 'text-rose-400 bg-rose-900/20 border-rose-700/20',
    },
    {
      icon: <Shield className="w-4 h-4 text-slate-400" />,
      title: 'Disclaimer',
      description: 'ForensicSaathi is a prototype for SIH 2026 (PS-26231). It is not a production security system. Security measures are implemented to demonstrate best practices for hackathon evaluation purposes.',
      badge: 'SIH 2026 · Demo Prototype',
      badgeColor: 'text-slate-400 bg-slate-800/40 border-slate-700/30',
    },
  ];

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-slate-200">Privacy &amp; Security</h2>
      </div>

      {/* Current account info */}
      {user && (
        <div className="panel-elevated p-4 mb-4">
          <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-3">Current Account</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Username', value: user.username },
              { label: 'Role', value: user.role },
              { label: 'Operator ID', value: user.operator_id },
              { label: 'Session', value: operator?.sessionId ?? '—' },
            ].map(row => (
              <div key={row.label} className="bg-slate-800/30 rounded p-2 border border-slate-700/20">
                <div className="text-[10px] text-slate-600 mb-0.5">{row.label}</div>
                <div className="text-xs text-slate-300 font-mono">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {securityItems.map(item => (
          <div key={item.title} className="panel-elevated p-4 flex items-start gap-4">
            <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-medium text-slate-200">{item.title}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
