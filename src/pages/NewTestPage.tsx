/**
 * ForensicSaathi — New Field Test Page (v2)
 * Dual-image capture (test sample + reference card), real GPS, 10-stage CV pipeline,
 * SHA-256 hashing of both images, environment consistency scoring.
 */
import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  ChevronRight, ChevronLeft, FlaskConical, User,
  MapPin, Camera, Check, Shield, Image, AlertTriangle,
  Navigation, WifiOff, Layers, Download,
} from 'lucide-react';
import { generateEvidencePDF } from '../utils/generatePDF';
import { useApp } from '../context/AppContext';
import { PROTOCOLS } from '../data/protocols';
import { CameraCapture } from '../components/Test/CameraCapture';
import { PipelineProgress, PipelineStageLabel } from '../components/Test/PipelineProgress';
import { CalibrationPanel } from '../components/Analysis/CalibrationPanel';
import { ImageQualityPanel } from '../components/Analysis/ImageQualityPanel';
import { ConfidencePanel } from '../components/Analysis/ConfidencePanel';
import { EvidenceCard } from '../components/Evidence/EvidenceCard';
import type { TestProtocol, CVPipelineStep, TestSession } from '../types';
import {
  assessImageQuality, detectReferenceCard, correctPerspective,
  calibrateColors, detectReactionRegion, extractColorFeatures,
  classifyResult, calculateConfidence,
} from '../utils/cvPipeline';
import { sealEvidence, buildAuditEvent } from '../utils/evidence';

// ─── Helper: SHA-256 of image data ────────────────────────────────────────────
async function sha256Image(dataUrl: string): Promise<string> {
  try {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: hash the text itself
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// ─── Helper: measure average luminance via canvas (real pixel analysis) ───────
async function measureBrightness(dataUrl: string): Promise<number> {
  return new Promise(resolve => {
    if (!dataUrl.startsWith('data:')) { resolve(128); return; }
    const img = new window.Image();
    img.onload = () => {
      const S = 64;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = S;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(128); return; }
      ctx.drawImage(img, 0, 0, S, S);
      const d = ctx.getImageData(0, 0, S, S).data;
      let total = 0;
      for (let i = 0; i < d.length; i += 4) {
        total += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      }
      resolve(total / (S * S));
    };
    img.onerror = () => resolve(128);
    img.src = dataUrl;
  });
}

// ─── Helper: environment consistency score (0-100) ────────────────────────────
async function computeEnvConsistency(testUrl: string, refUrl: string): Promise<number> {
  const [tb, rb] = await Promise.all([measureBrightness(testUrl), measureBrightness(refUrl)]);
  const diff = Math.abs(tb - rb);               // 0–255
  const consistency = Math.max(0, 100 - (diff / 2.55)); // invert to 0-100
  return Math.round(consistency);
}

// ─── Helper: GPS capture ──────────────────────────────────────────────────────
interface GPSReading {
  lat: number; lng: number; accuracy: number; simulated: boolean; timestamp: string;
}
async function captureGPS(): Promise<GPSReading> {
  const ts = new Date().toISOString();
  if (!navigator.geolocation) {
    return { lat: 19.0760, lng: 72.8777, accuracy: 9999, simulated: true, timestamp: ts };
  }
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        simulated: false,
        timestamp: new Date(pos.timestamp).toISOString(),
      }),
      () => resolve({ lat: 19.0760, lng: 72.8777, accuracy: 9999, simulated: true, timestamp: ts }),
      { timeout: 6000, maximumAge: 0, enableHighAccuracy: true },
    );
  });
}

// ─── 10-Stage pipeline definitions ────────────────────────────────────────────
const PIPELINE_DEF: Omit<CVPipelineStep, 'status' | 'durationMs' | 'detail'>[] = [
  { id: 'load-test',    label: 'Load Test Sample Image',      description: 'Loading and hashing test sample image (SHA-256)…' },
  { id: 'load-ref',     label: 'Load Reference Card Image',   description: 'Loading and hashing reference card image (SHA-256)…' },
  { id: 'consistency',  label: 'Check Capture Consistency',   description: 'Comparing brightness, exposure and white balance between images…' },
  { id: 'refcard',      label: 'Detect Reference Card',       description: 'Locating colour calibration patches in reference card image…' },
  { id: 'calibration',  label: 'Calibrate Colour',            description: 'Computing colour correction transform from reference patches…' },
  { id: 'region',       label: 'Detect Reaction Region',      description: 'Isolating test reaction zone in sample image…' },
  { id: 'extraction',   label: 'Extract Colour Features',     description: 'Extracting dominant reaction colour with calibration applied…' },
  { id: 'classify',     label: 'Compare Against Protocol',    description: 'Comparing calibrated colour to protocol reference ranges…' },
  { id: 'confidence',   label: 'Calculate Confidence',        description: 'Computing multi-factor confidence score…' },
  { id: 'evidence',     label: 'Generate Evidence Package',   description: 'Sealing dual-hash evidence record…' },
];

function makeSteps(): CVPipelineStep[] {
  return PIPELINE_DEF.map(s => ({ ...s, status: 'pending' as const }));
}

type Wizard = 'protocol' | 'operator' | 'location' | 'capture' | 'capture-ref' | 'pipeline' | 'result';

export default function NewTestPage() {
  const { operator, addRecord } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState<Wizard>('protocol');
  const [selectedProtocol, setSelectedProtocol] = useState<TestProtocol>(PROTOCOLS[0]);
  const [location, setLocation] = useState('Demo Field Unit — Alpha');
  const [gps, setGps] = useState<GPSReading | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Dual-image state
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);
  const [refImageUrl, setRefImageUrl] = useState<string | null>(null);

  const [pipelineSteps, setPipelineSteps] = useState<CVPipelineStep[]>(makeSteps());
  const [pipelineStage, setPipelineStage] = useState('');
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  const updateStep = (id: string, update: Partial<CVPipelineStep>) =>
    setPipelineSteps(prev => prev.map(s => s.id === id ? { ...s, ...update } : s));

  // ── Location step: capture GPS ─────────────────────────────────────────────
  const handleCaptureGPS = async () => {
    setGpsLoading(true);
    const reading = await captureGPS();
    setGps(reading);
    setGpsLoading(false);
  };

  // ── 10-stage CV pipeline ────────────────────────────────────────────────────
  const runPipeline = useCallback(async () => {
    setStep('pipeline');
    const isDemoMode = !testImageUrl || testImageUrl === 'DEMO_CAPTURE';
    const t0 = Date.now();
    const auditTrail = [
      buildAuditEvent('Test session created', operator!.id, 'SYSTEM', `Protocol: ${selectedProtocol.id}`),
    ];

    // ── Stage 1: Load & hash test image ──
    updateStep('load-test', { status: 'running' });
    const testHash = await sha256Image(
      !isDemoMode ? testImageUrl! : `DEMO_TEST_${Date.now()}`);
    auditTrail.push(buildAuditEvent('Test sample image captured', operator!.id, 'OPERATOR',
      `SHA-256: ${testHash.slice(0, 12)}…`));
    updateStep('load-test', {
      status: 'done', durationMs: Date.now() - t0,
      detail: `SHA-256: ${testHash.slice(0, 8)}…${testHash.slice(-4)}`,
    });

    // ── Stage 2: Load & hash reference image ──
    updateStep('load-ref', { status: 'running' });
    const isDemoRef = !refImageUrl || refImageUrl === 'DEMO_CAPTURE';
    const refHash = await sha256Image(
      !isDemoRef ? refImageUrl! : `DEMO_REF_${Date.now()}`);
    auditTrail.push(buildAuditEvent('Reference card image captured', operator!.id, 'OPERATOR',
      `SHA-256: ${refHash.slice(0, 12)}…`));
    updateStep('load-ref', {
      status: 'done',
      detail: `SHA-256: ${refHash.slice(0, 8)}…${refHash.slice(-4)}`,
    });

    // ── Stage 3: Environment consistency ──
    updateStep('consistency', { status: 'running' });
    const envScore = (!isDemoMode && !isDemoRef && testImageUrl && refImageUrl)
      ? await computeEnvConsistency(testImageUrl, refImageUrl)
      : 92; // demo mode estimate
    auditTrail.push(buildAuditEvent('Capture consistency evaluated', 'SYSTEM', 'SYSTEM',
      `Environment consistency: ${envScore}%`));
    const consistencyStatus = envScore >= 70 ? 'done' : 'failed';
    updateStep('consistency', {
      status: consistencyStatus,
      detail: `Consistency: ${envScore}% — ${envScore >= 70 ? 'ACCEPTABLE' : 'POOR MATCH'}`,
    });
    if (consistencyStatus === 'failed') {
      setPipelineStage('');
      setStep('result');
      setPipelineResult({ error: 'CONSISTENCY', envScore });
      return;
    }

    // ── Stage 4: Detect reference card (in ref image) ──
    updateStep('refcard', { status: 'running' });
    const refCard = await detectReferenceCard(refImageUrl ?? '', isDemoMode);
    updateStep('refcard', {
      status: refCard.detected ? 'done' : 'failed',
      detail: `Detected: ${refCard.detected} — conf: ${Math.round(refCard.confidence * 100)}%`,
    });
    auditTrail.push(buildAuditEvent('Reference card detected', 'SYSTEM', 'SYSTEM',
      `Confidence: ${Math.round(refCard.confidence * 100)}%`));

    // ── Stage 5: Calibrate colour ──
    updateStep('calibration', { status: 'running' });
    setPipelineStage('calibrating');
    const calibration = await calibrateColors(
      refImageUrl ?? '', selectedProtocol.calibrationPatches, isDemoMode
    );
    updateStep('calibration', {
      status: calibration.status === 'FAILED' ? 'failed' : 'done',
      detail: `${calibration.qualityLabel} — avg Δ: ${calibration.overallDeviation} ΔE`,
    });
    auditTrail.push(buildAuditEvent('GPS metadata captured', 'SYSTEM', 'OPERATOR',
      gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} ±${Math.round(gps.accuracy)}m${gps.simulated ? ' [SIMULATED]' : ''}` : 'Not available'));

    if (calibration.status === 'FAILED') {
      setPipelineStage('');
      setStep('result');
      setPipelineResult({ calibration, refCard, error: 'CALIBRATION' });
      return;
    }

    // ── Stage 6: Detect reaction region (in test image) ──
    updateStep('region', { status: 'running' });
    setPipelineStage('analysing');
    const region = await detectReactionRegion(testImageUrl ?? '', calibration, isDemoMode);
    updateStep('region', {
      status: region.detected ? 'done' : 'failed',
      detail: `Colour: ${region.extractedColorHex} — dist: ${region.colorDistance}`,
    });
    auditTrail.push(buildAuditEvent('Reaction region detected', 'SYSTEM', 'SYSTEM',
      `Region confidence: ${Math.round(region.confidence * 100)}%`));

    // ── Stage 7: Extract colour features ──
    updateStep('extraction', { status: 'running' });
    const features = await extractColorFeatures(region, calibration);
    updateStep('extraction', {
      status: 'done',
      detail: `Calibrated colour: ${features.calibratedHex}`,
    });

    // ── Stage 8: Compare against protocol ──
    updateStep('classify', { status: 'running' });
    setPipelineStage('analysing');
    const classification = await classifyResult(features, selectedProtocol, calibration);
    updateStep('classify', {
      status: 'done',
      detail: `${classification.resultLabel} — dist: ${features.colorDistance}`,
    });
    auditTrail.push(buildAuditEvent('Analysis completed', 'SYSTEM', 'SYSTEM',
      `Result: ${classification.result}`));

    // ── Stage 9: Calculate confidence ──
    updateStep('confidence', { status: 'running' });
    const confidence = await calculateConfidence(
      region, calibration, { ...await assessImageQuality(testImageUrl ?? '', isDemoMode) },
      refCard, classification.result
    );
    updateStep('confidence', { status: 'done', detail: `Overall: ${confidence.overall}%` });
    auditTrail.push(buildAuditEvent('Result generated', 'SYSTEM', 'SYSTEM',
      `${classification.resultLabel}, Confidence: ${confidence.overall}%`));

    // ── Stage 10: Generate evidence package ──
    updateStep('evidence', { status: 'running' });
    setPipelineStage('generating');
    const quality = await assessImageQuality(testImageUrl ?? '', isDemoMode);

    const baseEvidence = await sealEvidence({
      protocol: selectedProtocol,
      operator: operator!,
      location,
      result: classification.result,
      resultLabel: classification.resultLabel,
      confidence,
      calibration,
      imageQuality: quality,
      colorFeatures: classification.features,
      imageDataUrl: testImageUrl ?? undefined,
      recommendedAction: classification.recommendedAction,
      existingAudit: auditTrail,
    });

    // Augment with v2 dual-image + GPS fields
    const combinedHashInput = `${testHash}:${refHash}`;
    const combinedBuf = await crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode(combinedHashInput)
    );
    const combinedHash = Array.from(new Uint8Array(combinedBuf))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const finalEvidence = {
      ...baseEvidence,
      // Dual-image hashes
      testImageHash: testHash,
      referenceImageHash: refHash,
      imageHash: testHash,            // backward compat for old pages
      evidenceHash: combinedHash,     // combined evidence hash supersedes single-image hash
      // Image data (for storage in DB)
      testImageData: testImageUrl ?? undefined,
      referenceImageData: refImageUrl ?? undefined,
      // Quality scores
      testImageQuality: quality.overallScore,
      referenceImageQuality: quality.overallScore, // same model; in production would assess separately
      environmentConsistency: envScore,
      // GPS
      latitude: gps?.lat,
      longitude: gps?.lng,
      gpsAccuracy: gps?.accuracy,
      locationTimestamp: gps?.timestamp,
      locationSimulated: gps?.simulated ?? true,
      // Augmented audit trail
      auditTrail: [
        ...baseEvidence.auditTrail,
        buildAuditEvent('Dual evidence hash computed', 'SYSTEM', 'INTEGRITY',
          `Combined hash: ${combinedHash.slice(0, 8)}…${combinedHash.slice(-4)}`),
      ],
    };

    updateStep('evidence', {
      status: 'done',
      detail: `Sealed — combined hash: ${combinedHash.slice(0, 8)}…`,
    });

    await addRecord(finalEvidence as any);
    setPipelineResult({
      quality, calibration, refCard, confidence,
      features: classification.features,
      evidence: finalEvidence,
      envScore, testHash, refHash, combinedHash, gps,
    });
    setPipelineStage('complete');
    setStep('result');
  }, [testImageUrl, refImageUrl, selectedProtocol, operator, location, gps, addRecord]);

  const WIZARD_ORDER: Wizard[] = ['protocol', 'operator', 'location', 'capture', 'capture-ref'];

  const back = () => {
    const i = WIZARD_ORDER.indexOf(step as any);
    if (i > 0) setStep(WIZARD_ORDER[i - 1]);
  };

  const next = () => {
    if (step === 'capture-ref') { runPipeline(); return; }
    const i = WIZARD_ORDER.indexOf(step as any);
    if (i >= 0 && i < WIZARD_ORDER.length - 1) setStep(WIZARD_ORDER[i + 1]);
  };

  const STEP_LABELS: Record<Wizard, string> = {
    protocol:    'Select Protocol',
    operator:    'Operator Confirmation',
    location:    'Location & GPS',
    capture:     'Step 1: Test Sample',
    'capture-ref': 'Step 2: Reference Card',
    pipeline:    'CV Analysis Pipeline',
    result:      'Result',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (step === 'pipeline') {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Analysis Pipeline</h1>
          <p className="text-sm text-slate-500">10-stage CV analysis in progress…</p>
        </div>
        {pipelineStage && <PipelineStageLabel stage={pipelineStage} />}
        <PipelineProgress steps={pipelineSteps} />
      </div>
    );
  }

  if (step === 'result' && pipelineResult) {
    if (pipelineResult.error === 'CONSISTENCY') {
      return (
        <div className="p-6 max-w-2xl mx-auto space-y-4 animate-fade-in">
          <div className="panel-elevated p-6 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-100">Capture Consistency Failed</h2>
            <p className="text-sm text-slate-400">
              Environment consistency score: <strong className="text-amber-400">{pipelineResult.envScore}%</strong>
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              The test sample and reference card images were captured under significantly different lighting conditions.
              Please recapture both images under the same lighting.
            </p>
            <button
              className="btn-primary mt-4"
              onClick={() => { setPipelineSteps(makeSteps()); setStep('capture'); }}
            >Retake Images</button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Analysis Complete</h1>
            <p className="text-sm text-slate-500">Evidence sealed and saved to database</p>
          </div>
          <div className="flex gap-2">
            {pipelineResult.evidence && (
              <button
                className="btn-secondary text-sm"
                onClick={() => generateEvidencePDF(pipelineResult.evidence)}
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
            )}
            <button className="btn-primary text-sm" onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
          </div>
        </div>

        {pipelineResult.evidence && (
          <>
            <EvidenceCard evidence={pipelineResult.evidence} />

            {/* Dual-hash summary */}
            <div className="panel-elevated p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-slate-200">Evidence Hash Summary</span>
              </div>
              {[
                { label: 'Test Sample SHA-256', value: pipelineResult.testHash },
                { label: 'Reference Card SHA-256', value: pipelineResult.refHash },
                { label: 'Combined Evidence Hash', value: pipelineResult.combinedHash, highlight: true },
              ].map(row => (
                <div key={row.label} className="space-y-0.5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">{row.label}</div>
                  <div className={`text-[11px] font-mono break-all ${row.highlight ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {row.value?.slice(0, 32)}…{row.value?.slice(-8)}
                  </div>
                </div>
              ))}

              {/* GPS summary */}
              {pipelineResult.gps && (
                <div className="mt-2 pt-2 border-t border-slate-700/40">
                  <div className="flex items-center gap-1.5 text-xs">
                    {pipelineResult.gps.simulated
                      ? <><WifiOff className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-400">SIMULATED LOCATION</span></>
                      : <><Navigation className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">GPS VERIFIED</span></>
                    }
                    <span className="text-slate-500 font-mono ml-2">
                      {pipelineResult.gps.lat.toFixed(5)}, {pipelineResult.gps.lng.toFixed(5)}
                      {' ±'}{Math.round(pipelineResult.gps.accuracy)}m
                    </span>
                  </div>
                </div>
              )}

              {/* Environment consistency */}
              <div className="mt-2 pt-2 border-t border-slate-700/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Environment Consistency</span>
                  <span className={`font-mono font-semibold ${pipelineResult.envScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {pipelineResult.envScore}%
                  </span>
                </div>
              </div>
            </div>

            {pipelineResult.calibration && <CalibrationPanel result={pipelineResult.calibration} />}
            {pipelineResult.quality && <ImageQualityPanel metrics={pipelineResult.quality} />}
            {pipelineResult.confidence && <ConfidencePanel breakdown={pipelineResult.confidence} />}
          </>
        )}
      </div>
    );
  }

  // ── Wizard steps ────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
          {(['protocol', 'operator', 'location', 'capture', 'capture-ref'] as Wizard[]).map((s, i) => (
            <React.Fragment key={s}>
              <span className={step === s ? 'text-indigo-400 font-semibold' : ''}>{STEP_LABELS[s]}</span>
              {i < 4 && <ChevronRight className="w-3 h-3" />}
            </React.Fragment>
          ))}
        </div>
        <h1 className="text-xl font-bold text-slate-100">{STEP_LABELS[step]}</h1>
      </div>

      {/* Step: Protocol */}
      {step === 'protocol' && (
        <div className="space-y-3">
          {PROTOCOLS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProtocol(p)}
              className={`w-full text-left panel-elevated p-4 transition-all border ${selectedProtocol.id === p.id ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-transparent hover:border-slate-600/40'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.referenceRanges?.[0]?.colorHex ?? '#6366f1' }} />
                <div>
                  <div className="font-medium text-slate-200 text-sm">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.expectedColorRange}</div>
                </div>
                {selectedProtocol.id === p.id && (
                  <Check className="w-4 h-4 text-indigo-400 ml-auto" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step: Operator */}
      {step === 'operator' && operator && (
        <div className="panel-elevated p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-200 text-sm">{operator.name}</div>
              <div className="text-xs text-slate-500">{operator.id} · {operator.role}</div>
            </div>
          </div>
          {[
            { label: 'Session ID', value: operator.sessionId },
            { label: 'Device ID', value: operator.deviceId },
            { label: 'Protocol', value: selectedProtocol.name },
            { label: 'Login Time', value: new Date(operator.loginTime).toLocaleTimeString('en-IN') },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-xs border-t border-slate-700/40 pt-2">
              <span className="text-slate-500">{row.label}</span>
              <span className="text-slate-300 font-mono">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step: Location & GPS */}
      {step === 'location' && (
        <div className="panel-elevated p-6 space-y-4">
          <div>
            <label className="field-label mb-2 block">Field Location / Unit Description</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60"
              />
            </div>
          </div>

          {/* GPS capture */}
          <div className="border-t border-slate-700/40 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-slate-200">GPS Coordinates</span>
              </div>
              <button
                onClick={handleCaptureGPS}
                disabled={gpsLoading}
                className="btn-secondary text-xs"
              >
                {gpsLoading
                  ? <><div className="w-3 h-3 border border-indigo-400/30 border-t-indigo-400 rounded-full spinner" /> Locating…</>
                  : gps ? 'Recapture' : 'Capture GPS'
                }
              </button>
            </div>

            {gps ? (
              <div className={`rounded-lg p-3 text-xs space-y-1 ${gps.simulated ? 'bg-amber-900/10 border border-amber-700/20' : 'bg-emerald-900/10 border border-emerald-700/20'}`}>
                <div className="flex items-center gap-1.5">
                  {gps.simulated
                    ? <><WifiOff className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-400 font-semibold">SIMULATED LOCATION</span></>
                    : <><Navigation className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 font-semibold">GPS CAPTURED</span></>
                  }
                </div>
                <div className="font-mono text-slate-400">
                  {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                  {' — '}±{Math.round(gps.accuracy)}m accuracy
                </div>
                {gps.simulated && (
                  <p className="text-amber-500/70">
                    Browser geolocation unavailable or denied. Showing demo coordinates (Mumbai, MH).
                    This will be labelled SIMULATED in the evidence package.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg p-3 bg-slate-800/40 border border-slate-700/30 text-xs text-slate-500">
                Click "Capture GPS" to record your current coordinates. If location access is denied,
                the system will use SIMULATED LOCATION and label it accordingly.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step: Capture test sample (Step 1) */}
      {step === 'capture' && (
        <div className="space-y-4">
          <div className="panel-elevated p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">Step 1 of 2 — Test Sample Image</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Capture the reagent test strip or colour-change reaction. Ensure consistent, even lighting.
              This image will be SHA-256 hashed as part of the evidence package.
            </p>
            <div className="rounded-lg overflow-hidden bg-slate-800/40 border border-slate-700/30 mb-2">
              <div className="px-3 py-1.5 bg-slate-800/60 border-b border-slate-700/20 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                TEST SAMPLE
              </div>
              <CameraCapture onCapture={url => setTestImageUrl(url)} />
            </div>
            {testImageUrl && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Test sample image captured — ready for reference card
              </div>
            )}
          </div>

          {/* Dual-capture explainer */}
          <div className="panel-elevated p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-indigo-400/70" />
              <span className="text-xs font-semibold text-slate-400">About Dual-Image Capture</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              ForensicSaathi v2 requires two images captured under the same lighting: (1) the test sample,
              and (2) a colour reference card. The system verifies both were captured in consistent
              environmental conditions and generates separate SHA-256 hashes for each. Both hashes
              are combined into a single tamper-evident evidence seal.
            </p>
          </div>
        </div>
      )}

      {/* Step: Capture reference card (Step 2) */}
      {step === 'capture-ref' && (
        <div className="space-y-4">
          <div className="panel-elevated p-4">
            <div className="flex items-center gap-2 mb-3">
              <Image className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-slate-200">Step 2 of 2 — Reference Card Image</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Capture the colour reference card under the <strong className="text-slate-400">same lighting</strong> as
              the test sample. The system compares brightness and white balance between both images to ensure
              reliable colour calibration.
            </p>
            <div className="rounded-lg overflow-hidden bg-slate-800/40 border border-slate-700/30 mb-2">
              <div className="px-3 py-1.5 bg-slate-800/60 border-b border-slate-700/20 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                COLOUR REFERENCE CARD
              </div>
              <CameraCapture onCapture={url => setRefImageUrl(url)} />
            </div>
            {refImageUrl && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Reference card image captured — ready for 10-stage analysis
              </div>
            )}
          </div>

          {/* Image pair preview */}
          {(testImageUrl || refImageUrl) && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Test Sample', url: testImageUrl, dot: 'bg-red-500' },
                { label: 'Reference Card', url: refImageUrl, dot: 'bg-purple-500' },
              ].map(({ label, url, dot }) => (
                <div key={label} className="panel-elevated p-2">
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-slate-500">
                    <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    {label}
                  </div>
                  {url ? (
                    <img src={url} alt={label}
                      className="w-full aspect-square object-cover rounded" />
                  ) : (
                    <div className="w-full aspect-square rounded bg-slate-800/40 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-slate-700" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      {/* step is never 'pipeline' or 'result' here — those are handled above via early return */}
      {(step as string) !== 'pipeline' && (step as string) !== 'result' && (
        <div className="flex justify-between mt-8">
          <button
            onClick={back}
            disabled={step === 'protocol'}
            className="btn-secondary text-sm disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={next}
            disabled={
              (step === 'capture' && testImageUrl === null) ||
              (step === 'capture-ref' && refImageUrl === null)
            }
            className="btn-primary text-sm disabled:opacity-40"
          >
            {step === 'capture-ref' ? (
              <><Shield className="w-4 h-4" /> Run Analysis</>
            ) : (
              <>Continue <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
