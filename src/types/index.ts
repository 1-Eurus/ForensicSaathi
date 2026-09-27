// ─── Enums ───────────────────────────────────────────────────────────────────

export type PresumptiveResult =
  | 'PRESUMPTIVE_POSITIVE'
  | 'PRESUMPTIVE_NEGATIVE'
  | 'INCONCLUSIVE'
  | 'REPEAT_TEST_RECOMMENDED'
  | 'CALIBRATION_FAILED'
  | 'QUALITY_INSUFFICIENT';

export type EvidenceStatus = 'SEALED' | 'DRAFT' | 'TAMPERED' | 'UNVERIFIED';
export type CalibrationStatus = 'PASSED' | 'FAILED' | 'PENDING' | 'POOR';
export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';
export type VerificationStatus = 'VERIFIED' | 'FAILED' | 'UNVERIFIED' | 'PENDING';

// ─── Protocol / Test Definition ───────────────────────────────────────────────

export interface ColorReference {
  name: string;
  hex: string;
  rgb: [number, number, number];
  description: string;
}

export interface ReferenceRange {
  resultLabel: PresumptiveResult;
  minDistance: number;
  maxDistance: number;
  colorDescription: string;
  colorHex: string;
}

export interface CalibrationPatch {
  id: string;
  label: string;
  expectedHex: string;
  expectedRGB: [number, number, number];
}

export interface TestProtocol {
  id: string;
  name: string;
  shortName: string;
  description: string;
  reactionType: string;
  expectedColorRange: string;
  referenceCardId: string;
  recommendedConditions: string[];
  calibrationPatches: CalibrationPatch[];
  referenceRanges: ReferenceRange[];
  analysisVersion: string;
}

// ─── Image Quality ────────────────────────────────────────────────────────────

export interface ImageQualityMetrics {
  sharpness: number;
  brightness: number;
  contrast: number;
  glare: number;
  referenceVisibility: number;
  testRegionVisibility: number;
  alignment: number;
  overallScore: number;
  status: 'ACCEPTABLE' | 'POOR' | 'MARGINAL';
  message: string;
}

// ─── Calibration ──────────────────────────────────────────────────────────────

export interface PatchMeasurement {
  patchId: string;
  label: string;
  expectedHex: string;
  capturedHex: string;
  expectedRGB: [number, number, number];
  capturedRGB: [number, number, number];
  deviation: number;
}

export interface CalibrationResult {
  status: CalibrationStatus;
  overallDeviation: number;
  patches: PatchMeasurement[];
  correctionMatrix: number[][];
  qualityLabel: string;
  message: string;
}

// ─── CV Pipeline ──────────────────────────────────────────────────────────────

export interface CVPipelineStep {
  id: string;
  label: string;
  description: string;
  status: PipelineStepStatus;
  durationMs?: number;
  detail?: string;
}

export interface ReferenceCardDetection {
  detected: boolean;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface ReactionRegionDetection {
  detected: boolean;
  confidence: number;
  extractedColorHex: string;
  extractedColorRGB: [number, number, number];
  colorDistance: number;
}

export interface ColorFeatures {
  dominantHex: string;
  dominantRGB: [number, number, number];
  calibratedHex: string;
  calibratedRGB: [number, number, number];
  colorDistance: number;
  matchedRange: ReferenceRange | null;
}

export interface ConfidenceBreakdown {
  colorMatch: number;
  calibrationQuality: number;
  imageQuality: number;
  regionDetection: number;
  referenceCardConfidence: number;
  overall: number;
  explanation: string;
}

// ─── Evidence Package ─────────────────────────────────────────────────────────

export interface EvidencePackage {
  testId: string;
  protocolId: string;
  protocolName: string;
  operatorId: string;
  sessionId: string;
  deviceId: string;
  timestamp: string;
  timestampIST: string;
  location: string;
  latitude?: number;
  longitude?: number;
  result: PresumptiveResult;
  resultLabel: string;
  confidence: number;
  imageHash: string;
  metadataHash: string;
  evidenceHash: string;
  calibrationStatus: CalibrationStatus;
  calibrationResult: CalibrationResult;
  imageQualityScore: number;
  imageQualityMetrics: ImageQualityMetrics;
  colorFeatures: ColorFeatures;
  confidenceBreakdown: ConfidenceBreakdown;
  analysisVersion: string;
  softwareVersion: string;
  evidenceStatus: EvidenceStatus;
  verificationStatus: VerificationStatus;
  auditTrail: AuditEvent[];
  recommendedAction: string;
  disclaimer: string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  timestamp: string;
  event: string;
  detail?: string;
  actor: string;
  category: 'SYSTEM' | 'OPERATOR' | 'VERIFICATION' | 'INTEGRITY';
}

// ─── Verification ─────────────────────────────────────────────────────────────

export interface VerificationReport {
  testId: string;
  verifiedAt: string;
  verifiedBy: string;
  imageHashMatch: boolean;
  metadataHashMatch: boolean;
  evidenceHashMatch: boolean;
  recordUnaltered: boolean;
  overallStatus: VerificationStatus;
  computedHash: string;
  storedHash: string;
  checks: VerificationCheck[];
  tamperDetails?: string;
}

export interface VerificationCheck {
  label: string;
  passed: boolean;
  detail: string;
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface Operator {
  id: string;
  name: string;
  sessionId: string;
  deviceId: string;
  role: string;
  loginTime: string;
}

export interface TestSession {
  id: string;
  protocol: TestProtocol;
  operator: Operator;
  location: string;
  status: 'setup' | 'capture' | 'calibrating' | 'analysing' | 'complete' | 'failed';
  imageDataUrl?: string;
  capturedAt?: string;
  evidence?: EvidencePackage;
  pipelineSteps: CVPipelineStep[];
  pipelineComplete: boolean;
  verificationReport?: VerificationReport;
}

export interface DashboardStats {
  totalTests: number;
  todayTests: number;
  presumptivePositive: number;
  inconclusive: number;
  evidenceSealed: number;
  integrityFailures: number;
}
