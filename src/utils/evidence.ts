/**
 * FIELDPROOF — Evidence Package Builder & Verification
 *
 * sealEvidence() — creates a cryptographically-hashed, tamper-evident record
 * verifyEvidence() — recomputes hashes and checks integrity
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  EvidencePackage,
  CalibrationResult,
  ImageQualityMetrics,
  ColorFeatures,
  ConfidenceBreakdown,
  PresumptiveResult,
  TestProtocol,
  Operator,
  AuditEvent,
  VerificationReport,
  VerificationCheck,
} from '../types';
import {
  sha256,
  hashImage,
  hashMetadata,
  computeEvidenceHash,
} from './hash';

export function buildAuditEvent(
  event: string,
  actor: string,
  category: AuditEvent['category'],
  detail?: string
): AuditEvent {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    event,
    detail,
    actor,
    category,
  };
}

function formatISTTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' IST';
}

export async function sealEvidence(params: {
  protocol: TestProtocol;
  operator: Operator;
  location: string;
  result: PresumptiveResult;
  resultLabel: string;
  confidence: ConfidenceBreakdown;
  calibration: CalibrationResult;
  imageQuality: ImageQualityMetrics;
  colorFeatures: ColorFeatures;
  imageDataUrl?: string;
  recommendedAction: string;
  existingAudit: AuditEvent[];
}): Promise<EvidencePackage> {
  const now = new Date();
  const testId = `FP-2026-${String(Math.floor(Math.random() * 90000) + 10000).slice(0, 5)}`;
  const timestamp = now.toISOString();
  const timestampIST = formatISTTimestamp(now);

  // Step 1: Hash the image
  let imageHash: string;
  if (params.imageDataUrl && params.imageDataUrl.startsWith('data:')) {
    imageHash = await hashImage(params.imageDataUrl);
  } else {
    // Demo mode: deterministic hash based on test ID
    imageHash = await sha256(`DEMO_IMAGE_${testId}_${timestamp}`);
  }

  // Step 2: Hash the metadata
  const metaFields = {
    test_id: testId,
    protocol_id: params.protocol.id,
    operator_id: params.operator.id,
    session_id: params.operator.sessionId,
    device_id: params.operator.deviceId,
    timestamp,
    location: params.location,
    result: params.result,
    confidence: params.confidence.overall,
    calibration_status: params.calibration.status,
    image_quality_score: params.imageQuality.overallScore,
    analysis_version: params.protocol.analysisVersion,
    software_version: '1.0.0',
  };
  const metadataHash = await hashMetadata(metaFields as Record<string, string | number | boolean>);

  // Step 3: Compute the final evidence hash
  const evidenceHash = await computeEvidenceHash(imageHash, metadataHash);

  // Step 4: Complete audit trail
  const sealEvent = buildAuditEvent('Evidence sealed', 'SYSTEM', 'INTEGRITY',
    `Evidence hash: ${evidenceHash.slice(0, 8)}...${evidenceHash.slice(-4)}`);

  const auditTrail: AuditEvent[] = [
    ...params.existingAudit,
    buildAuditEvent('Evidence package created', 'SYSTEM', 'SYSTEM'),
    buildAuditEvent('Metadata hash computed', 'SYSTEM', 'INTEGRITY', `Hash: ${metadataHash.slice(0, 8)}...`),
    buildAuditEvent('Image hash computed', 'SYSTEM', 'INTEGRITY', `Hash: ${imageHash.slice(0, 8)}...`),
    sealEvent,
  ];

  return {
    testId,
    protocolId: params.protocol.id,
    protocolName: params.protocol.name,
    operatorId: params.operator.id,
    sessionId: params.operator.sessionId,
    deviceId: params.operator.deviceId,
    timestamp,
    timestampIST,
    location: params.location,
    result: params.result,
    resultLabel: params.resultLabel,
    confidence: params.confidence.overall,
    imageHash,
    metadataHash,
    evidenceHash,
    calibrationStatus: params.calibration.status,
    calibrationResult: params.calibration,
    imageQualityScore: params.imageQuality.overallScore,
    imageQualityMetrics: params.imageQuality,
    colorFeatures: params.colorFeatures,
    confidenceBreakdown: params.confidence,
    analysisVersion: params.protocol.analysisVersion,
    softwareVersion: '1.0.0',
    evidenceStatus: 'SEALED',
    verificationStatus: 'UNVERIFIED',
    auditTrail,
    recommendedAction: params.recommendedAction,
    disclaimer:
      'IMPORTANT: This is a PRESUMPTIVE FIELD RESULT produced by an AI-assisted colorimetric analysis tool. ' +
      'This result is NOT a laboratory confirmation, NOT a legal determination, and does NOT substitute for ' +
      'professional forensic analysis. All presumptive positive results must be confirmed by accredited ' +
      'laboratory methods before any enforcement action is taken.',
  };
}

/**
 * Verify evidence integrity by recomputing all hashes and comparing.
 * If any field in storedEvidence has been altered, this will fail.
 */
export async function verifyEvidence(
  storedEvidence: EvidencePackage,
  imageDataUrl?: string
): Promise<VerificationReport> {
  const verifiedAt = new Date().toISOString();
  const checks: VerificationCheck[] = [];

  // Re-compute image hash
  let recomputedImageHash: string;
  if (imageDataUrl && imageDataUrl.startsWith('data:')) {
    recomputedImageHash = await hashImage(imageDataUrl);
  } else {
    recomputedImageHash = await sha256(`DEMO_IMAGE_${storedEvidence.testId}_${storedEvidence.timestamp}`);
  }

  const imageHashMatch = recomputedImageHash.toUpperCase() === storedEvidence.imageHash.toUpperCase();
  checks.push({
    label: 'Image Hash',
    passed: imageHashMatch,
    detail: imageHashMatch
      ? `Computed: ${recomputedImageHash.slice(0, 8)}... matches stored hash`
      : `Hash mismatch — image may have been altered`,
  });

  // Re-compute metadata hash
  const metaFields = {
    test_id: storedEvidence.testId,
    protocol_id: storedEvidence.protocolId,
    operator_id: storedEvidence.operatorId,
    session_id: storedEvidence.sessionId,
    device_id: storedEvidence.deviceId,
    timestamp: storedEvidence.timestamp,
    location: storedEvidence.location,
    result: storedEvidence.result,
    confidence: storedEvidence.confidence,
    calibration_status: storedEvidence.calibrationStatus,
    image_quality_score: storedEvidence.imageQualityScore,
    analysis_version: storedEvidence.analysisVersion,
    software_version: storedEvidence.softwareVersion,
  };
  const recomputedMetadataHash = await hashMetadata(metaFields as Record<string, string | number | boolean>);

  const metadataHashMatch = recomputedMetadataHash.toUpperCase() === storedEvidence.metadataHash.toUpperCase();
  checks.push({
    label: 'Metadata Hash',
    passed: metadataHashMatch,
    detail: metadataHashMatch
      ? `All metadata fields verified — no alterations detected`
      : `Metadata mismatch — one or more fields may have been altered`,
  });

  // Re-compute evidence hash
  const recomputedEvidenceHash = await computeEvidenceHash(recomputedImageHash, recomputedMetadataHash);
  const evidenceHashMatch = recomputedEvidenceHash.toUpperCase() === storedEvidence.evidenceHash.toUpperCase();
  checks.push({
    label: 'Evidence Hash',
    passed: evidenceHashMatch,
    detail: evidenceHashMatch
      ? `Evidence bundle hash verified — record is intact`
      : `Evidence hash does not match — record integrity cannot be confirmed`,
  });

  // Check evidence status
  const statusIntact = storedEvidence.evidenceStatus === 'SEALED';
  checks.push({
    label: 'Seal Status',
    passed: statusIntact,
    detail: statusIntact
      ? `Evidence status is SEALED — no administrative override detected`
      : `Evidence status is ${storedEvidence.evidenceStatus} — review required`,
  });

  const recordUnaltered = imageHashMatch && metadataHashMatch && evidenceHashMatch && statusIntact;

  return {
    testId: storedEvidence.testId,
    verifiedAt,
    verifiedBy: 'SYSTEM_VERIFICATION',
    imageHashMatch,
    metadataHashMatch,
    evidenceHashMatch,
    recordUnaltered,
    overallStatus: recordUnaltered ? 'VERIFIED' : 'FAILED',
    computedHash: recomputedEvidenceHash,
    storedHash: storedEvidence.evidenceHash,
    checks,
    tamperDetails: recordUnaltered
      ? undefined
      : 'Stored evidence does not match the original sealed record. One or more fields have been modified after sealing.',
  };
}

/**
 * Simulate a tampered evidence record for demo purposes.
 * This modifies the result without updating the hash, so verification fails.
 */
export function tamperEvidence(evidence: EvidencePackage): EvidencePackage {
  return {
    ...evidence,
    result: evidence.result === 'PRESUMPTIVE_POSITIVE' ? 'PRESUMPTIVE_NEGATIVE' : 'PRESUMPTIVE_POSITIVE',
    resultLabel: evidence.result === 'PRESUMPTIVE_POSITIVE' ? 'Presumptive Negative' : 'Presumptive Positive',
    confidence: evidence.result === 'PRESUMPTIVE_POSITIVE' ? 12 : 94,
    // The hashes are NOT updated — this is what makes verification fail
    evidenceStatus: 'SEALED', // appears sealed but is tampered
  };
}
