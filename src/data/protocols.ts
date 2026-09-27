import type { TestProtocol } from '../types';

export const PROTOCOLS: TestProtocol[] = [
  {
    id: 'DEMO-COLOR-A',
    name: 'Demo Colorimetric Test A',
    shortName: 'Demo Test A',
    description:
      'Simulated Marquis-type colorimetric reaction for demonstration purposes. ' +
      'Designed to show purple-to-black colour transition indicative of aromatic amines.',
    reactionType: 'Marquis-type (simulated)',
    expectedColorRange: 'Orange → Purple → Black',
    referenceCardId: 'REF-CARD-ALPHA',
    recommendedConditions: [
      'Diffuse natural or LED lighting — avoid direct sunlight',
      'Camera distance 15–25 cm from test surface',
      'White or neutral background',
      'Full reference colour card in frame',
      'No motion blur — brace device or use tripod',
    ],
    calibrationPatches: [
      { id: 'P01', label: 'Patch 01 – White Reference', expectedHex: '#F5F5F0', expectedRGB: [245, 245, 240] },
      { id: 'P02', label: 'Patch 02 – Neutral Grey',   expectedHex: '#9E9E9E', expectedRGB: [158, 158, 158] },
      { id: 'P03', label: 'Patch 03 – Deep Charcoal',  expectedHex: '#424242', expectedRGB: [66, 66, 66] },
      { id: 'P04', label: 'Patch 04 – Reference Red',  expectedHex: '#C62828', expectedRGB: [198, 40, 40] },
      { id: 'P05', label: 'Patch 05 – Reference Blue', expectedHex: '#1565C0', expectedRGB: [21, 101, 192] },
    ],
    referenceRanges: [
      {
        resultLabel: 'PRESUMPTIVE_POSITIVE',
        minDistance: 0,
        maxDistance: 18,
        colorDescription: 'Purple to Black (reaction present)',
        colorHex: '#6A0DAD',
      },
      {
        resultLabel: 'INCONCLUSIVE',
        minDistance: 19,
        maxDistance: 30,
        colorDescription: 'Intermediate colour — inconclusive zone',
        colorHex: '#795548',
      },
      {
        resultLabel: 'PRESUMPTIVE_NEGATIVE',
        minDistance: 31,
        maxDistance: 150,
        colorDescription: 'Orange/Yellow (no reaction)',
        colorHex: '#F57C00',
      },
    ],
    analysisVersion: '1.0.0',
  },

  {
    id: 'DEMO-COLOR-B',
    name: 'Demo Colorimetric Test B',
    shortName: 'Demo Test B',
    description:
      'Simulated Scott-type colorimetric reaction for demonstration purposes. ' +
      'Designed to show blue colour transition indicative of target compounds.',
    reactionType: 'Scott-type (simulated)',
    expectedColorRange: 'Clear → Pale Blue → Vivid Blue',
    referenceCardId: 'REF-CARD-BETA',
    recommendedConditions: [
      'Controlled indoor lighting preferred',
      'Camera distance 10–20 cm from test surface',
      'Avoid harsh shadows across test region',
      'Full reference colour card in frame',
      'Capture within 60 seconds of reaction initiation',
    ],
    calibrationPatches: [
      { id: 'P01', label: 'Patch 01 – White Reference', expectedHex: '#FAFAFA', expectedRGB: [250, 250, 250] },
      { id: 'P02', label: 'Patch 02 – Neutral Grey',   expectedHex: '#BDBDBD', expectedRGB: [189, 189, 189] },
      { id: 'P03', label: 'Patch 03 – Deep Charcoal',  expectedHex: '#616161', expectedRGB: [97, 97, 97] },
      { id: 'P04', label: 'Patch 04 – Reference Red',  expectedHex: '#D32F2F', expectedRGB: [211, 47, 47] },
      { id: 'P05', label: 'Patch 05 – Reference Blue', expectedHex: '#0D47A1', expectedRGB: [13, 71, 161] },
    ],
    referenceRanges: [
      {
        resultLabel: 'PRESUMPTIVE_POSITIVE',
        minDistance: 0,
        maxDistance: 15,
        colorDescription: 'Vivid Blue (reaction present)',
        colorHex: '#1976D2',
      },
      {
        resultLabel: 'INCONCLUSIVE',
        minDistance: 16,
        maxDistance: 28,
        colorDescription: 'Pale / ambiguous blue — inconclusive',
        colorHex: '#90CAF9',
      },
      {
        resultLabel: 'PRESUMPTIVE_NEGATIVE',
        minDistance: 29,
        maxDistance: 150,
        colorDescription: 'Clear or yellow (no reaction)',
        colorHex: '#FFF9C4',
      },
    ],
    analysisVersion: '1.0.0',
  },

  {
    id: 'CUSTOM',
    name: 'Custom Protocol',
    shortName: 'Custom',
    description:
      'Configure your own colorimetric test parameters. Requires manual calibration patch definition and reference range setup by an authorised administrator.',
    reactionType: 'User-defined',
    expectedColorRange: 'User-defined',
    referenceCardId: 'REF-CARD-CUSTOM',
    recommendedConditions: [
      'Follow protocol-specific capture requirements',
      'Ensure reference card is fully visible',
      'Capture under consistent lighting conditions',
    ],
    calibrationPatches: [
      { id: 'P01', label: 'Patch 01 – White Reference', expectedHex: '#FFFFFF', expectedRGB: [255, 255, 255] },
      { id: 'P02', label: 'Patch 02 – Neutral Grey',   expectedHex: '#808080', expectedRGB: [128, 128, 128] },
      { id: 'P03', label: 'Patch 03 – Black Reference', expectedHex: '#1A1A1A', expectedRGB: [26, 26, 26] },
    ],
    referenceRanges: [
      {
        resultLabel: 'INCONCLUSIVE',
        minDistance: 0,
        maxDistance: 200,
        colorDescription: 'Custom range not configured',
        colorHex: '#888888',
      },
    ],
    analysisVersion: '1.0.0',
  },
];

export const getProtocolById = (id: string): TestProtocol | undefined =>
  PROTOCOLS.find(p => p.id === id);
