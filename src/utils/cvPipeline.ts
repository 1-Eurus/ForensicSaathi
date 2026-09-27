/**
 * ForensicSaathi — Computer Vision Pipeline (Simulated Modular Architecture)
 *
 * Each function is architectured as a separate module with a well-defined
 * interface, so real CV/ML models can replace the simulated logic later.
 *
 * Pipeline:
 * Image Input → Quality Assessment → Reference Card Detection →
 * Perspective Correction → Colour Calibration → Reaction Region Detection →
 * Colour Feature Extraction → Classification → Confidence Estimation
 */

import type {
  ImageQualityMetrics,
  CalibrationResult,
  CalibrationPatch,
  PatchMeasurement,
  ReferenceCardDetection,
  ReactionRegionDetection,
  ColorFeatures,
  ConfidenceBreakdown,
  TestProtocol,
  PresumptiveResult,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2)
  );
}

function simulateDelay(minMs: number, maxMs: number): Promise<void> {
  return new Promise(res => setTimeout(res, randomInRange(minMs, maxMs)));
}

// ─── Step 1: Image Quality Assessment ────────────────────────────────────────

export async function assessImageQuality(
  _imageDataUrl: string,
  isDemoMode = true
): Promise<ImageQualityMetrics> {
  await simulateDelay(300, 500);

  if (isDemoMode) {
    // Simulate good-quality demo image
    const sharpness = randomInRange(90, 98);
    const brightness = randomInRange(82, 94);
    const contrast = randomInRange(85, 96);
    const glare = randomInRange(86, 96);
    const referenceVisibility = randomInRange(94, 99);
    const testRegionVisibility = randomInRange(91, 97);
    const alignment = randomInRange(92, 99);

    const overallScore = Math.round(
      (sharpness * 0.2 + brightness * 0.15 + contrast * 0.15 +
       glare * 0.1 + referenceVisibility * 0.2 + testRegionVisibility * 0.1 + alignment * 0.1)
    );

    return {
      sharpness,
      brightness,
      contrast,
      glare,
      referenceVisibility,
      testRegionVisibility,
      alignment,
      overallScore,
      status: 'ACCEPTABLE',
      message: 'Capture quality is sufficient for analysis.',
    };
  }

  // For real image: would use Canvas API to compute actual metrics
  const overallScore = randomInRange(70, 95);
  const status = overallScore >= 80 ? 'ACCEPTABLE' : overallScore >= 60 ? 'MARGINAL' : 'POOR';
  return {
    sharpness: randomInRange(65, 95),
    brightness: randomInRange(65, 95),
    contrast: randomInRange(65, 95),
    glare: randomInRange(65, 95),
    referenceVisibility: randomInRange(65, 95),
    testRegionVisibility: randomInRange(65, 95),
    alignment: randomInRange(65, 95),
    overallScore,
    status,
    message: status === 'ACCEPTABLE'
      ? 'Capture quality is sufficient for analysis.'
      : status === 'MARGINAL'
      ? 'Image quality is marginal. Results may have reduced reliability.'
      : 'Analysis paused because image quality may affect interpretation.',
  };
}

// ─── Step 2: Reference Card Detection ────────────────────────────────────────

export async function detectReferenceCard(
  _imageDataUrl: string,
  isDemoMode = true
): Promise<ReferenceCardDetection> {
  await simulateDelay(200, 400);

  if (isDemoMode) {
    return {
      detected: true,
      confidence: randomInRange(93, 99) / 100,
      boundingBox: { x: 20, y: 20, width: 180, height: 120 },
    };
  }

  // Real implementation: use contour detection or ArUco markers
  const confidence = randomInRange(70, 98) / 100;
  return {
    detected: confidence > 0.6,
    confidence,
    boundingBox: confidence > 0.6 ? { x: 15, y: 18, width: 170, height: 115 } : undefined,
  };
}

// ─── Step 3: Perspective Correction ──────────────────────────────────────────

export async function correctPerspective(
  _imageDataUrl: string,
  _referenceCard: ReferenceCardDetection
): Promise<{ corrected: boolean; skewAngle: number }> {
  await simulateDelay(150, 300);
  // In a real implementation: homography transform using detected card corners
  return {
    corrected: true,
    skewAngle: (Math.random() * 4 - 2), // -2° to +2°
  };
}

// ─── Step 4: Colour Calibration ───────────────────────────────────────────────

export async function calibrateColors(
  _imageDataUrl: string,
  patches: CalibrationPatch[],
  isDemoMode = true
): Promise<CalibrationResult> {
  await simulateDelay(400, 700);

  const patchMeasurements: PatchMeasurement[] = patches.map(patch => {
    const expectedRGB = hexToRgb(patch.expectedHex);
    // Simulate a realistic camera capture with minor deviation
    const drift = isDemoMode ? randomInRange(2, 8) : randomInRange(5, 25);
    const capturedRGB: [number, number, number] = [
      Math.max(0, Math.min(255, expectedRGB[0] + randomInRange(-drift, drift))),
      Math.max(0, Math.min(255, expectedRGB[1] + randomInRange(-drift, drift))),
      Math.max(0, Math.min(255, expectedRGB[2] + randomInRange(-drift, drift))),
    ];
    const capturedHex = rgbToHex(...capturedRGB);
    const deviation = colorDistance(expectedRGB, capturedRGB);

    return {
      patchId: patch.id,
      label: patch.label,
      expectedHex: patch.expectedHex,
      capturedHex,
      expectedRGB,
      capturedRGB,
      deviation: Math.round(deviation * 10) / 10,
    };
  });

  const avgDeviation = patchMeasurements.reduce((s, p) => s + p.deviation, 0) / patchMeasurements.length;
  const roundedDev = Math.round(avgDeviation * 10) / 10;

  const status: CalibrationResult['status'] =
    roundedDev < 10 ? 'PASSED' :
    roundedDev < 20 ? 'POOR' : 'FAILED';

  // Simplified 3x3 identity + correction matrix (real: least-squares fit)
  const correctionMatrix = [
    [1 + (Math.random() - 0.5) * 0.02, 0, 0],
    [0, 1 + (Math.random() - 0.5) * 0.02, 0],
    [0, 0, 1 + (Math.random() - 0.5) * 0.02],
  ];

  return {
    status,
    overallDeviation: roundedDev,
    patches: patchMeasurements,
    correctionMatrix,
    qualityLabel: status === 'PASSED' ? 'GOOD' : status === 'POOR' ? 'MARGINAL' : 'POOR',
    message: status === 'PASSED'
      ? 'Colour calibration successful. Results are reliable.'
      : status === 'POOR'
      ? 'Calibration quality is marginal. Results should be treated with caution.'
      : 'Calibration quality insufficient. Retake image.',
  };
}

// ─── Step 5: Reaction Region Detection ───────────────────────────────────────

export async function detectReactionRegion(
  _imageDataUrl: string,
  calibration: CalibrationResult,
  isDemoMode = true
): Promise<ReactionRegionDetection> {
  await simulateDelay(300, 500);

  if (isDemoMode) {
    // For demo: simulate a positive reaction (purple/violet hue)
    const targetRGB: [number, number, number] = [142, 68, 173]; // Marquis-like purple
    const noise = 6;
    const capturedRGB: [number, number, number] = [
      targetRGB[0] + randomInRange(-noise, noise),
      targetRGB[1] + randomInRange(-noise, noise),
      targetRGB[2] + randomInRange(-noise, noise),
    ];
    const colorDist = colorDistance(capturedRGB, targetRGB);

    return {
      detected: true,
      confidence: randomInRange(93, 98) / 100,
      extractedColorHex: rgbToHex(...capturedRGB),
      extractedColorRGB: capturedRGB,
      colorDistance: Math.round(colorDist * 10) / 10,
    };
  }

  // For real image: use region of interest + colour statistics
  const detected = calibration.status !== 'FAILED';
  const fakeRGB: [number, number, number] = [randomInRange(80, 200), randomInRange(40, 180), randomInRange(60, 200)];
  return {
    detected,
    confidence: detected ? randomInRange(70, 95) / 100 : 0.2,
    extractedColorHex: detected ? rgbToHex(...fakeRGB) : '#888888',
    extractedColorRGB: fakeRGB,
    colorDistance: randomInRange(5, 40),
  };
}

// ─── Step 6: Colour Feature Extraction ────────────────────────────────────────

export async function extractColorFeatures(
  region: ReactionRegionDetection,
  calibration: CalibrationResult
): Promise<ColorFeatures> {
  await simulateDelay(100, 200);

  // Apply calibration correction to the raw extracted colour
  const raw = region.extractedColorRGB;
  const m = calibration.correctionMatrix;
  const calibratedRGB: [number, number, number] = [
    Math.max(0, Math.min(255, Math.round(raw[0] * m[0][0] + raw[1] * m[0][1] + raw[2] * m[0][2]))),
    Math.max(0, Math.min(255, Math.round(raw[0] * m[1][0] + raw[1] * m[1][1] + raw[2] * m[1][2]))),
    Math.max(0, Math.min(255, Math.round(raw[0] * m[2][0] + raw[1] * m[2][1] + raw[2] * m[2][2]))),
  ];

  return {
    dominantHex: region.extractedColorHex,
    dominantRGB: region.extractedColorRGB,
    calibratedHex: rgbToHex(...calibratedRGB),
    calibratedRGB,
    colorDistance: region.colorDistance,
    matchedRange: null, // set by classifyResult
  };
}

// ─── Step 7: Classification ───────────────────────────────────────────────────

export async function classifyResult(
  features: ColorFeatures,
  protocol: TestProtocol,
  calibration: CalibrationResult
): Promise<{ result: PresumptiveResult; features: ColorFeatures; resultLabel: string; recommendedAction: string }> {
  await simulateDelay(200, 400);

  // If calibration failed, don't attempt classification
  if (calibration.status === 'FAILED') {
    return {
      result: 'CALIBRATION_FAILED',
      features,
      resultLabel: 'Calibration Failed',
      recommendedAction: 'Recapture the image with a clearly visible reference card under adequate lighting.',
    };
  }

  const dist = features.colorDistance;
  let matchedRange = null;
  let result: PresumptiveResult = 'INCONCLUSIVE';

  for (const range of protocol.referenceRanges) {
    if (dist >= range.minDistance && dist <= range.maxDistance) {
      matchedRange = range;
      result = range.resultLabel;
      break;
    }
  }

  const updatedFeatures = { ...features, matchedRange };

  const actionMap: Record<PresumptiveResult, string> = {
    PRESUMPTIVE_POSITIVE: 'Submit specimen for laboratory confirmation. Document chain of custody.',
    PRESUMPTIVE_NEGATIVE: 'Result indicates no presumptive positive reaction. Standard documentation applies.',
    INCONCLUSIVE: 'Observed colour falls between validated reference ranges. Repeat field test or submit for laboratory confirmation.',
    REPEAT_TEST_RECOMMENDED: 'Test quality insufficient for reliable classification. Repeat under better conditions.',
    CALIBRATION_FAILED: 'Recapture the image with a clearly visible reference card.',
    QUALITY_INSUFFICIENT: 'Image quality below minimum threshold. Recapture under better conditions.',
  };

  return {
    result,
    features: updatedFeatures,
    resultLabel: result === 'PRESUMPTIVE_POSITIVE' ? 'Presumptive Positive'
      : result === 'PRESUMPTIVE_NEGATIVE' ? 'Presumptive Negative'
      : result === 'INCONCLUSIVE' ? 'Inconclusive'
      : result === 'REPEAT_TEST_RECOMMENDED' ? 'Repeat Test Recommended'
      : result === 'CALIBRATION_FAILED' ? 'Calibration Failed'
      : 'Quality Insufficient',
    recommendedAction: actionMap[result],
  };
}

// ─── Step 8: Confidence Estimation ────────────────────────────────────────────

export async function calculateConfidence(
  regionDetection: ReactionRegionDetection,
  calibration: CalibrationResult,
  quality: ImageQualityMetrics,
  referenceCard: ReferenceCardDetection,
  result: PresumptiveResult
): Promise<ConfidenceBreakdown> {
  await simulateDelay(150, 300);

  if (result === 'CALIBRATION_FAILED' || result === 'QUALITY_INSUFFICIENT') {
    return {
      colorMatch: 0,
      calibrationQuality: 0,
      imageQuality: quality.overallScore,
      regionDetection: regionDetection.confidence * 100,
      referenceCardConfidence: referenceCard.confidence * 100,
      overall: 0,
      explanation: 'Confidence cannot be computed due to calibration or quality failure.',
    };
  }

  const colorMatch = result === 'INCONCLUSIVE'
    ? randomInRange(45, 65)
    : randomInRange(88, 97);

  const calibrationQuality = calibration.status === 'PASSED'
    ? randomInRange(88, 96)
    : randomInRange(50, 70);

  const imageQuality = quality.overallScore;
  const regionConf = Math.round(regionDetection.confidence * 100);
  const refCardConf = Math.round(referenceCard.confidence * 100);

  const overall = Math.round(
    colorMatch * 0.35 +
    calibrationQuality * 0.25 +
    imageQuality * 0.20 +
    regionConf * 0.12 +
    refCardConf * 0.08
  );

  return {
    colorMatch,
    calibrationQuality,
    imageQuality,
    regionDetection: regionConf,
    referenceCardConfidence: refCardConf,
    overall,
    explanation: result === 'INCONCLUSIVE'
      ? `Overall confidence is ${overall}%. The colour measurement falls between validated positive and negative ranges. Laboratory confirmation is strongly recommended.`
      : `Overall confidence is ${overall}%. Colour match (${colorMatch}%), calibration quality (${calibrationQuality}%), and image quality (${imageQuality}%) all contributed to this assessment.`,
  };
}
