/**
 * ForensicSaathi — PDF Evidence Report Generator
 * Uses jsPDF + QRCode to produce a tamper-evident, printable PDF
 * that documents the full field test result and chain of custody.
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { EvidencePackage } from '../types';

// ─── Colours (ForensicSaathi dark-theme brand converted for white PDF) ────────────
const C = {
  black:     [10, 13, 18]  as const,
  darkGray:  [30, 35, 45]  as const,
  gray:      [80, 90, 105] as const,
  lightGray: [200, 205, 215] as const,
  white:     [255, 255, 255] as const,
  indigo:    [79, 70, 229]  as const,
  emerald:   [16, 185, 129] as const,
  red:       [220, 38, 38]  as const,
  amber:     [217, 119, 6]  as const,
  slate:     [100, 116, 139] as const,
  bgLight:   [248, 249, 252] as const,
  bgStripe:  [241, 245, 249] as const,
  border:    [226, 232, 240] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setFill(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}
function setDraw(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}
function setTextColor(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function resultColor(result: string): readonly [number, number, number] {
  if (result === 'PRESUMPTIVE_POSITIVE') return C.red;
  if (result === 'PRESUMPTIVE_NEGATIVE') return C.emerald;
  if (result === 'INCONCLUSIVE') return C.amber;
  return C.gray;
}

function resultLabel(result: string): string {
  const map: Record<string, string> = {
    PRESUMPTIVE_POSITIVE:      'PRESUMPTIVE POSITIVE',
    PRESUMPTIVE_NEGATIVE:      'PRESUMPTIVE NEGATIVE',
    INCONCLUSIVE:              'INCONCLUSIVE',
    REPEAT_TEST_RECOMMENDED:   'REPEAT TEST RECOMMENDED',
    CALIBRATION_FAILED:        'CALIBRATION FAILED',
    QUALITY_INSUFFICIENT:      'QUALITY INSUFFICIENT',
  };
  return map[result] ?? result.replace(/_/g, ' ');
}

function truncHash(h?: string, head = 16, tail = 8): string {
  if (!h) return 'N/A';
  if (h.length <= head + tail + 3) return h;
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

function formatTs(ts?: string): string {
  if (!ts) return 'N/A';
  try {
    return new Date(ts).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }) + ' IST';
  } catch {
    return ts;
  }
}

// Draw a horizontal rule
function hRule(doc: jsPDF, y: number, lx: number, rx: number, weight = 0.3): void {
  setDraw(doc, C.border);
  doc.setLineWidth(weight);
  doc.line(lx, y, rx, y);
}

// Draw a labeled row in a two-column table
function tableRow(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  lx: number,
  labelW: number,
  rowH: number,
  stripe: boolean,
): number {
  const rw = 210 - lx * 2;
  if (stripe) {
    setFill(doc, C.bgStripe);
    doc.rect(lx, y, rw, rowH, 'F');
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setTextColor(doc, C.gray);
  doc.text(label, lx + 2, y + rowH * 0.65);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, C.darkGray);
  doc.text(value, lx + 2 + labelW, y + rowH * 0.65);
  return y + rowH;
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function generateEvidencePDF(evidence: EvidencePackage): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210;  // page width mm
  const LX = 15;  // left margin
  const RX = PW - LX; // right margin x
  const CW = RX - LX; // content width

  let y = 0;

  // ─── Cover header ───────────────────────────────────────────────────────────
  // Deep navy header bar
  setFill(doc, C.black);
  doc.rect(0, 0, PW, 38, 'F');

  // Accent stripe
  setFill(doc, C.indigo);
  doc.rect(0, 38, PW, 2, 'F');

  // ForensicSaathi wordmark
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setTextColor(doc, C.white);
  doc.text('ForensicSaathi', LX, 16);

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setTextColor(doc, C.lightGray);
  doc.text('EVIDENCE INTEGRITY ENGINE  ·  SIH 2026 — PS 26231', LX, 22);

  // Report title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setTextColor(doc, [180, 190, 210] as const);
  doc.text('FORENSIC FIELD TEST EVIDENCE REPORT', LX, 32);

  // Generated timestamp (top-right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setTextColor(doc, C.gray);
  doc.text(`Generated: ${formatTs(new Date().toISOString())}`, RX, 14, { align: 'right' });
  doc.text(`Doc ID: ${evidence.testId ?? 'N/A'}`, RX, 20, { align: 'right' });

  y = 46;

  // ─── RESULT banner ──────────────────────────────────────────────────────────
  const resCol = resultColor(evidence.result ?? '');
  setFill(doc, [...resCol, 0.12] as any);  // tinted
  setFill(doc, resCol);
  // Color block
  doc.rect(LX, y, 4, 16, 'F');

  setFill(doc, [245, 247, 250] as const);
  doc.rect(LX + 4, y, CW - 4, 16, 'F');
  setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.rect(LX, y, CW, 16, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setTextColor(doc, resCol);
  doc.text(resultLabel(evidence.result ?? 'INCONCLUSIVE'), LX + 8, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setTextColor(doc, C.gray);
  doc.text(`Confidence: ${evidence.confidence ?? 0}%`, RX - 2, y + 10.5, { align: 'right' });

  y += 22;

  // ─── Section: Test Details ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setTextColor(doc, C.indigo);
  doc.text('TEST DETAILS', LX, y);
  y += 1.5;
  hRule(doc, y, LX, RX, 0.5);
  y += 4;

  const LABEL_W = 42;
  const ROW_H = 6.2;
  const rows1: [string, string][] = [
    ['Test ID',             evidence.testId ?? 'N/A'],
    ['Protocol',            evidence.protocolId ?? 'N/A'],
    ['Operator ID',         evidence.operatorId ?? 'N/A'],
    ['Session ID',          evidence.sessionId ?? 'N/A'],
    ['Timestamp',           formatTs(evidence.timestamp)],
    ['Location',            evidence.location ?? 'N/A'],
    ['Evidence Status',     evidence.evidenceStatus ?? 'N/A'],
    ['Verification Status', evidence.verificationStatus ?? 'N/A'],
    ['Analysis Version',    evidence.analysisVersion ?? 'N/A'],
    ['Software Version',    evidence.softwareVersion ?? 'N/A'],
  ];
  rows1.forEach(([label, value], i) => {
    y = tableRow(doc, y, label, value, LX, LABEL_W, ROW_H, i % 2 === 0);
  });
  y += 4;

  // ─── Section: GPS / Location ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setTextColor(doc, C.indigo);
  doc.text('GPS LOCATION', LX, y);
  y += 1.5;
  hRule(doc, y, LX, RX, 0.5);
  y += 4;

  const gpsRows: [string, string][] = [
    ['Latitude',            evidence.latitude  != null ? evidence.latitude.toFixed(6)  : 'N/A'],
    ['Longitude',           evidence.longitude != null ? evidence.longitude.toFixed(6) : 'N/A'],
    ['Accuracy',            evidence.gpsAccuracy != null ? `±${Math.round(evidence.gpsAccuracy)}m` : 'N/A'],
    ['Location Timestamp',  formatTs(evidence.locationTimestamp)],
    ['Location Source',     evidence.locationSimulated ? 'SIMULATED (browser denied)' : 'GPS — VERIFIED'],
  ];
  gpsRows.forEach(([label, value], i) => {
    y = tableRow(doc, y, label, value, LX, LABEL_W, ROW_H, i % 2 === 0);
  });
  y += 4;

  // ─── Section: Evidence Hashes ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setTextColor(doc, C.indigo);
  doc.text('CRYPTOGRAPHIC EVIDENCE HASHES (SHA-256)', LX, y);
  y += 1.5;
  hRule(doc, y, LX, RX, 0.5);
  y += 4;

  const hashRows: [string, string][] = [
    ['Test Sample Hash',    truncHash(evidence.testImageHash ?? evidence.imageHash, 32, 16)],
    ['Reference Card Hash', truncHash(evidence.referenceImageHash, 32, 16)],
    ['Combined Evidence Hash', truncHash(evidence.evidenceHash, 32, 16)],
    ['Image Hash (legacy)', truncHash(evidence.imageHash, 32, 16)],
  ];
  hashRows.forEach(([label, value], i) => {
    y = tableRow(doc, y, label, value, LX, LABEL_W, ROW_H, i % 2 === 0);
  });

  // Full combined hash (monospace, smaller)
  if (evidence.evidenceHash) {
    y += 3;
    setFill(doc, C.bgStripe);
    doc.rect(LX, y, CW, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setTextColor(doc, C.gray);
    doc.text('FULL EVIDENCE HASH:', LX + 2, y + 4);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    setTextColor(doc, [16, 185, 129] as const); // emerald
    // Split 64-char hash into two 32-char lines
    const h = evidence.evidenceHash;
    doc.text(h.slice(0, 32), LX + 2, y + 7.5);
    doc.text(h.slice(32), LX + 2 + 55, y + 7.5);
    y += 13;
  } else {
    y += 4;
  }

  // ─── Section: Image Quality & Calibration ─────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setTextColor(doc, C.indigo);
  doc.text('IMAGE QUALITY & CALIBRATION', LX, y);
  y += 1.5;
  hRule(doc, y, LX, RX, 0.5);
  y += 4;

  const qcRows: [string, string][] = [
    ['Test Image Quality',   evidence.testImageQuality  != null ? `${evidence.testImageQuality}%`  : 'N/A'],
    ['Ref Image Quality',    evidence.referenceImageQuality != null ? `${evidence.referenceImageQuality}%` : 'N/A'],
    ['Env. Consistency',     evidence.environmentConsistency != null ? `${evidence.environmentConsistency}%` : 'N/A'],
    ['Calibration Status',   evidence.calibrationResult?.status ?? evidence.calibrationStatus ?? 'N/A'],
    ['Calibration Deviation', evidence.calibrationResult?.overallDeviation != null
      ? `${evidence.calibrationResult.overallDeviation} ΔE` : 'N/A'],
    ['Confidence (Overall)', `${evidence.confidence ?? 0}%`],
    ['Color Match',          evidence.confidenceBreakdown?.colorMatch != null
      ? `${evidence.confidenceBreakdown.colorMatch}%` : 'N/A'],
  ];
  qcRows.forEach(([label, value], i) => {
    y = tableRow(doc, y, label, value, LX, LABEL_W, ROW_H, i % 2 === 0);
  });
  y += 6;

  // ─── QR Code ─────────────────────────────────────────────────────────────
  try {
    const qrPayload = JSON.stringify({
      testId:        evidence.testId,
      evidenceHash:  evidence.evidenceHash ?? evidence.imageHash,
      result:        evidence.result,
      confidence:    evidence.confidence,
      timestamp:     evidence.timestamp,
      operatorId:    evidence.operatorId,
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 200,
      margin: 1,
      color: { dark: '#0a0d12', light: '#ffffff' },
    });

    // QR section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTextColor(doc, C.indigo);
    doc.text('EVIDENCE QR CODE', LX, y);
    y += 1.5;
    hRule(doc, y, LX, RX, 0.5);
    y += 4;

    // Draw QR image
    const QR_SIZE = 38;
    doc.addImage(qrDataUrl, 'PNG', LX, y, QR_SIZE, QR_SIZE);

    // QR legend
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(doc, C.gray);
    doc.text('Scan to verify:', LX + QR_SIZE + 5, y + 6);
    doc.setFont('helvetica', 'bold');
    setTextColor(doc, C.darkGray);
    doc.text(`Test ID: ${evidence.testId ?? 'N/A'}`, LX + QR_SIZE + 5, y + 12);
    doc.setFont('helvetica', 'normal');
    setTextColor(doc, C.gray);
    doc.text('This QR code encodes the test ID, result,', LX + QR_SIZE + 5, y + 18);
    doc.text('operator, and evidence hash. Scan with', LX + QR_SIZE + 5, y + 23);
    doc.text('ForensicSaathi Verify app to confirm integrity.', LX + QR_SIZE + 5, y + 28);

    y += QR_SIZE + 8;
  } catch (e) {
    // QR generation failed — skip silently
    y += 4;
  }

  // ─── Audit Trail ─────────────────────────────────────────────────────────
  if (evidence.auditTrail && evidence.auditTrail.length > 0) {
    // Check if we need a new page
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTextColor(doc, C.indigo);
    doc.text('AUDIT TRAIL', LX, y);
    y += 1.5;
    hRule(doc, y, LX, RX, 0.5);
    y += 4;

    evidence.auditTrail.forEach((event, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const stripe = i % 2 === 0;
      if (stripe) {
        setFill(doc, C.bgStripe);
        doc.rect(LX, y, CW, 8.5, 'F');
      }

      // Category badge color
      const catColor: Record<string, readonly [number, number, number]> = {
        SYSTEM:       C.indigo,
        OPERATOR:     C.emerald,
        VERIFICATION: C.amber,
        INTEGRITY:    C.red,
      };
      const cc = catColor[event.category] ?? C.gray;
      setFill(doc, cc);
      doc.rect(LX, y, 2, 8.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setTextColor(doc, C.darkGray);
      doc.text(event.event ?? '', LX + 4, y + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      setTextColor(doc, C.gray);
      doc.text(formatTs(event.timestamp), LX + 4, y + 7);

      if (event.detail) {
        doc.text(`  → ${event.detail}`, LX + 40, y + 7);
      }
      doc.text(`[${event.category}] ${event.actor ?? ''}`, RX - 2, y + 3.5, { align: 'right' });

      y += 9;
    });
    y += 4;
  }

  // ─── Disclaimer footer ─────────────────────────────────────────────────────
  // Always put footer at bottom of last page
  const FOOTER_Y = 280;
  hRule(doc, FOOTER_Y, LX, RX, 0.3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setTextColor(doc, C.red);
  doc.text('⚠  DISCLAIMER — PRESUMPTIVE RESULTS ONLY', LX, FOOTER_Y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setTextColor(doc, C.gray);
  doc.text(
    'All results in this document are presumptive field results generated by AI-assisted colorimetric analysis.',
    LX, FOOTER_Y + 8
  );
  doc.text(
    'These results are NOT laboratory confirmations and MUST NOT be used as the sole basis for enforcement action.',
    LX, FOOTER_Y + 12
  );
  doc.text(
    'Laboratory confirmation is required before any legal proceedings. This document is for chain-of-custody documentation only.',
    LX, FOOTER_Y + 16
  );

  // Page numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setTextColor(doc, C.slate);
    doc.text(`Page ${i} of ${totalPages}  ·  ForensicSaathi Evidence Report  ·  ${evidence.testId ?? ''}`, PW / 2, 290, { align: 'center' });
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  const filename = `ForensicSaathi_${evidence.testId ?? 'UNKNOWN'}_${Date.now()}.pdf`;
  doc.save(filename);
}
