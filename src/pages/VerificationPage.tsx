import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Search, AlertTriangle, ChevronRight, Play, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VerificationReportView } from '../components/Evidence/VerificationReport';
import { Badge } from '../components/ui/Badge';
import { verifyEvidence, tamperEvidence } from '../utils/evidence';
import { resultBadgeVariant } from '../components/ui/Badge';
import type { VerificationReport, EvidencePackage } from '../types';
import { format } from 'date-fns';

type DemoPhase = 'idle' | 'picking' | 'pre-verify' | 'verified' | 'tamper' | 'post-verify' | 'failed';

export default function VerificationPage() {
  const { records, operator, updateRecord, tamperedRecordId, setTamperedRecordId } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const demoTamper = params.get('demo') === 'tamper';
  const preselectedId = params.get('testId');

  const [selectedId, setSelectedId] = useState<string>(preselectedId ?? records[0]?.testId ?? '');
  const [verifying, setVerifying] = useState(false);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>(demoTamper ? 'picking' : 'idle');
  const [localTampered, setLocalTampered] = useState(false);

  const selectedRecord = records.find(r => r.testId === selectedId);

  // Auto-advance demo mode if pre-selected
  useEffect(() => {
    if (demoTamper && preselectedId) {
      setSelectedId(preselectedId);
      setDemoPhase('pre-verify');
    }
  }, [demoTamper, preselectedId]);

  const runVerification = async (record: EvidencePackage) => {
    setVerifying(true);
    setReport(null);
    await new Promise(r => setTimeout(r, 1800));
    const result = await verifyEvidence(record, operator?.id ?? 'SYSTEM');
    setReport(result);
    setVerifying(false);
  };

  const handleVerify = async () => {
    if (!selectedRecord) return;
    await runVerification(selectedRecord);
    if (demoPhase === 'pre-verify') setDemoPhase('verified');
  };

  const handleTamper = () => {
    if (!selectedRecord) return;
    const t = tamperEvidence(selectedRecord);
    updateRecord(t.testId, t);
    setTamperedRecordId(selectedId);
    setLocalTampered(true);
    setReport(null);
    if (demoPhase === 'verified') setDemoPhase('tamper');
  };

  const handlePostTamperVerify = async () => {
    const record = records.find(r => r.testId === selectedId)!;
    setDemoPhase('post-verify');
    await runVerification(record);
    setDemoPhase('failed');
  };

  /* ── Non-demo mode (standard verification) ── */
  if (!demoTamper) {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100">Evidence Verification</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cryptographic SHA-256 integrity check</p>
        </div>

        {/* Record selector */}
        <div className="panel-elevated p-5 mb-4">
          <label className="field-label block mb-2">Select Evidence Record</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setReport(null); }}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 appearance-none"
            >
              {records.map(r => (
                <option key={r.testId} value={r.testId}>
                  {r.testId} — {r.result} ({r.operatorId})
                </option>
              ))}
            </select>
          </div>
          {selectedRecord && (
            <div className="mt-3 pt-3 border-t border-slate-700/30 flex items-center justify-between text-xs text-slate-500">
              <span>Protocol: {selectedRecord.protocolId}</span>
              <span>{format(new Date(selectedRecord.timestamp), 'dd MMM yyyy HH:mm')}</span>
              <Badge variant={resultBadgeVariant(selectedRecord.result)}>{selectedRecord.resultLabel}</Badge>
            </div>
          )}
        </div>

        <button onClick={handleVerify} disabled={!selectedRecord || verifying} className="btn-primary w-full justify-center mb-4">
          <ShieldCheck className="w-4 h-4" />
          {verifying ? 'Verifying…' : 'Verify Cryptographic Integrity'}
        </button>

        {(verifying || report) && (
          <div className="panel-elevated p-5">
            <VerificationReportView report={report} loading={verifying} />
          </div>
        )}
      </div>
    );
  }

  /* ── Demo tamper detection mode (WOW flow) ── */
  const DEMO_STEPS = [
    { phase: 'picking',    label: 'Step 1', desc: 'Select a sealed evidence record', icon: <Search className="w-5 h-5" /> },
    { phase: 'pre-verify', label: 'Step 2', desc: 'Verify original — should PASS',   icon: <ShieldCheck className="w-5 h-5" /> },
    { phase: 'verified',   label: 'Step 3', desc: 'Simulate tampering',              icon: <AlertTriangle className="w-5 h-5" /> },
    { phase: 'tamper',     label: 'Step 4', desc: 'Verify tampered — should FAIL',   icon: <ShieldAlert className="w-5 h-5" /> },
    { phase: 'failed',     label: 'Done',   desc: 'Integrity check failed ⚠',        icon: <ShieldAlert className="w-5 h-5" /> },
  ];

  const phaseIdx = DEMO_STEPS.findIndex(s => s.phase === demoPhase);

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <button onClick={() => navigate('/dashboard')} className="hover:text-slate-300">Dashboard</button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-300">Tamper Detection Demo</span>
        </div>
        <h1 className="text-xl font-bold text-slate-100">Evidence Integrity — WOW Demo</h1>
        <p className="text-sm text-slate-500 mt-0.5">See how FIELDPROOF detects evidence tampering in real-time</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {DEMO_STEPS.map((s, i) => (
          <React.Fragment key={s.phase}>
            <div className={`flex-shrink-0 flex flex-col items-center gap-1 text-center ${
              i < phaseIdx ? 'text-emerald-400' : i === phaseIdx ? 'text-indigo-300' : 'text-slate-600'
            }`}>
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                i < phaseIdx ? 'border-emerald-600 bg-emerald-900/20' :
                i === phaseIdx ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-700'
              }`}>
                {React.cloneElement(s.icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
              </div>
              <div className="text-[9px] font-mono">{s.label}</div>
            </div>
            {i < DEMO_STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < phaseIdx ? 'bg-emerald-800/50' : 'bg-slate-800'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="panel-elevated p-5 space-y-5">

        {/* PHASE: picking */}
        {(demoPhase === 'picking' || demoPhase === 'idle') && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">1 · Select a Sealed Evidence Record</h3>
            <div className="space-y-2">
              {records.filter(r => r.evidenceStatus === 'SEALED').slice(0, 4).map(r => (
                <button
                  key={r.testId}
                  onClick={() => { setSelectedId(r.testId); setDemoPhase('pre-verify'); }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedId === r.testId ? 'border-indigo-500/40 bg-indigo-900/10' : 'border-slate-700/40 hover:border-slate-600/60 bg-slate-800/20 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-slate-200">{r.testId}</span>
                    <Badge variant={resultBadgeVariant(r.result)}>{r.resultLabel}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{r.operatorId} · {r.protocolId} · {format(new Date(r.timestamp), 'dd MMM HH:mm')}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PHASE: pre-verify (step 2) */}
        {demoPhase === 'pre-verify' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">2 · Verify Original Evidence</h3>
            <p className="text-xs text-slate-500">Run the SHA-256 integrity check on the unaltered record. It should pass.</p>
            <div className="flex items-center gap-2 p-3 bg-slate-800/40 rounded-lg border border-slate-700/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-sm text-slate-200">{selectedId}</span>
            </div>
            {!report ? (
              <button onClick={handleVerify} disabled={verifying} className="btn-primary w-full justify-center">
                <Play className="w-4 h-4" /> {verifying ? 'Verifying…' : 'Verify Evidence'}
              </button>
            ) : (
              <VerificationReportView report={report} loading={verifying} />
            )}
            {report && report.overallStatus === 'VERIFIED' && (
              <button onClick={() => { setDemoPhase('verified'); setReport(null); }} className="btn-secondary w-full justify-center text-sm">
                Proceed to Tamper Step →
              </button>
            )}
          </div>
        )}

        {/* PHASE: verified → about to tamper */}
        {demoPhase === 'verified' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">3 · Simulate Tampering</h3>
            <div className="bg-amber-900/10 border border-amber-700/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-amber-300 mb-1">Demo Only — Simulated Tampering</div>
                  <p className="text-xs text-amber-400/70 leading-relaxed">
                    In a real corruption attempt, an adversary might alter the stored result (e.g. change "Presumptive Positive"
                    to "Presumptive Negative") without updating the SHA-256 hash. FIELDPROOF detects this by recomputing and comparing.
                  </p>
                </div>
              </div>
            </div>
            <button onClick={handleTamper} className="btn-danger w-full justify-center">
              <Zap className="w-4 h-4" /> Simulate Result Tampering
            </button>
          </div>
        )}

        {/* PHASE: tampered — ready for post-verify */}
        {demoPhase === 'tamper' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">4 · Verify Tampered Evidence</h3>
            <div className="bg-red-900/10 border border-red-700/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-red-300">Record has been mutated</div>
                  <div className="text-xs text-red-400/60 mt-0.5">
                    The result field was altered but the hash was NOT updated. Now run verification again.
                  </div>
                </div>
              </div>
            </div>
            {!report ? (
              <button onClick={handlePostTamperVerify} disabled={verifying} className="btn-danger w-full justify-center">
                <ShieldAlert className="w-4 h-4" /> {verifying ? 'Verifying…' : 'Run Integrity Check Now'}
              </button>
            ) : (
              <VerificationReportView report={report} loading={verifying} />
            )}
          </div>
        )}

        {/* PHASE: post-verify result (after button click transitions to tamper) */}
        {demoPhase === 'post-verify' && (
          <VerificationReportView report={report} loading={verifying} />
        )}

        {demoPhase === 'failed' && report && (
          <div className="space-y-4">
            <VerificationReportView report={report} loading={false} />
            <div className="pt-3 border-t border-slate-700/30">
              <div className="text-xs text-slate-500 text-center mb-3">
                ✓ Demo complete — FIELDPROOF successfully detected the tampering via SHA-256 hash mismatch.
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1 text-sm justify-center">← Dashboard</button>
                <button onClick={() => navigate(`/test/${selectedId}`)} className="btn-primary flex-1 text-sm justify-center">View Full Record</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
