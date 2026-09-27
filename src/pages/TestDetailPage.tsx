import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ShieldCheck, Activity, AlertTriangle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EvidenceCard } from '../components/Evidence/EvidenceCard';
import { AuditTimeline } from '../components/Evidence/AuditTimeline';
import { VerificationReportView } from '../components/Evidence/VerificationReport';
import { CalibrationPanel } from '../components/Analysis/CalibrationPanel';
import { ImageQualityPanel } from '../components/Analysis/ImageQualityPanel';
import { ConfidencePanel } from '../components/Analysis/ConfidencePanel';
import { verifyEvidence, tamperEvidence } from '../utils/evidence';
import type { VerificationReport } from '../types';

type TabId = 'evidence' | 'calibration' | 'quality' | 'confidence' | 'audit' | 'verification';

const TABS: { id: TabId; label: string }[] = [
  { id: 'evidence',     label: 'Evidence' },
  { id: 'calibration',  label: 'Calibration' },
  { id: 'quality',      label: 'Image Quality' },
  { id: 'confidence',   label: 'Confidence' },
  { id: 'audit',        label: 'Audit Trail' },
  { id: 'verification', label: 'Verification' },
];

export default function TestDetailPage() {
  const { testId } = useParams<{ testId: string }>();
  const { getRecord, updateRecord, operator, tamperedRecordId, setTamperedRecordId } = useApp();
  const navigate = useNavigate();

  const record = getRecord(testId ?? '');
  const [activeTab, setActiveTab] = useState<TabId>('evidence');
  const [verifying, setVerifying] = useState(false);
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [tampered, setTampered] = useState(tamperedRecordId === testId);

  if (!record) {
    return (
      <div className="p-6 text-center">
        <div className="text-slate-500 mb-4">Evidence record not found: <span className="font-mono">{testId}</span></div>
        <button onClick={() => navigate('/history')} className="btn-secondary text-sm">← Back to History</button>
      </div>
    );
  }

  const handleVerify = async () => {
    setActiveTab('verification');
    setVerifying(true);
    setVerificationReport(null);
    await new Promise(r => setTimeout(r, 1800)); // realistic delay for crypto
    const report = await verifyEvidence(record, operator?.id ?? 'SYSTEM');
    setVerificationReport(report);
    setVerifying(false);
  };

  const handleTamper = () => {
    const tampered = tamperEvidence(record);
    updateRecord(tampered.testId, tampered);
    setTamperedRecordId(testId ?? null);
    setTampered(true);
    setVerificationReport(null); // reset verification so they re-run it
    setActiveTab('evidence');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <button onClick={() => navigate('/dashboard')} className="hover:text-slate-300">Dashboard</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => navigate('/history')} className="hover:text-slate-300">History</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-mono text-slate-300">{record.testId}</span>
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold font-mono text-slate-100">{record.testId}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{record.protocolId} · {record.location} · {record.operatorId}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleVerify} className="btn-primary text-xs">
            <ShieldCheck className="w-3.5 h-3.5" /> Verify Integrity
          </button>
          {!tampered && (
            <button onClick={handleTamper} className="btn-danger text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> Demo Tamper
            </button>
          )}
        </div>
      </div>

      {/* Tamper warning */}
      {tampered && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-red-900/15 border border-red-600/30">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-red-300">⚠ Record Tampered (Demo)</div>
            <div className="text-xs text-red-400/70 mt-0.5">
              This record's result has been mutated without updating the hash — run Verify Integrity to see the integrity check fail.
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 mb-5 bg-slate-900/50 rounded-lg p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === t.id
                ? 'bg-slate-700/70 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'evidence' && <EvidenceCard evidence={record} />}

        {activeTab === 'calibration' && record.calibrationResult && (
          <div className="panel-elevated p-5">
            <CalibrationPanel result={record.calibrationResult} />
          </div>
        )}

        {activeTab === 'quality' && record.imageQualityMetrics && (
          <div className="panel-elevated p-5">
            <ImageQualityPanel metrics={record.imageQualityMetrics} />
          </div>
        )}

        {activeTab === 'confidence' && (
          <div className="panel-elevated p-5">
            <ConfidencePanel breakdown={record.confidenceBreakdown} />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="panel-elevated p-5">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">Audit Trail — {record.auditTrail.length} events</div>
            <AuditTimeline events={record.auditTrail} />
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="panel-elevated p-5">
            {!verifying && !verificationReport && (
              <div className="text-center py-10">
                <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <div className="text-sm text-slate-400 mb-4">Run cryptographic hash verification to check evidence integrity</div>
                <button onClick={handleVerify} className="btn-primary text-sm">
                  <ShieldCheck className="w-4 h-4" /> Run Verification
                </button>
              </div>
            )}
            <VerificationReportView report={verificationReport} loading={verifying} />
          </div>
        )}
      </div>
    </div>
  );
}
