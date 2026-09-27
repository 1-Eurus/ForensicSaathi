/**
 * FIELDPROOF — Hash & Tamper-Evidence Utilities
 * Uses the Web Crypto API (SHA-256) for real cryptographic hashing.
 */

/**
 * Compute SHA-256 of an arbitrary string and return the hex digest.
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Hash an image represented as a base64 data URL.
 * We hash the raw base64 content (without the header) for reproducibility.
 */
export async function hashImage(dataUrl: string): Promise<string> {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return sha256(base64);
}

/**
 * Compute a "metadata hash" — a SHA-256 over the key fields
 * that make this evidence record unique and traceable.
 */
export async function hashMetadata(fields: Record<string, string | number | boolean>): Promise<string> {
  const canonical = JSON.stringify(fields, Object.keys(fields).sort());
  return sha256(canonical);
}

/**
 * Compute the final evidence hash — a SHA-256 over both the
 * image hash and the metadata hash together.
 */
export async function computeEvidenceHash(imageHash: string, metadataHash: string): Promise<string> {
  return sha256(`FIELDPROOF:${imageHash}:${metadataHash}`);
}

/**
 * Format a long hex hash into a short display form: first 4 + last 4.
 * e.g. "8F31A1B7...C921D034"
 */
export function formatHashShort(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

/**
 * Format a hash with groups for readability.
 */
export function formatHashDisplay(hash: string): string {
  return hash.match(/.{1,8}/g)?.join(' ') ?? hash;
}

/**
 * Generate a deterministic "fake" image hash for demo images that
 * don't have a real camera capture (using a seed string).
 * This still uses real SHA-256 for correctness.
 */
export async function generateDemoImageHash(seed: string): Promise<string> {
  const demoBase64 = btoa(`DEMO_IMAGE_${seed}_${new Date().toISOString()}`);
  return sha256(demoBase64);
}

/**
 * Verify two hashes match.
 */
export function hashesMatch(a: string, b: string): boolean {
  return a.toUpperCase() === b.toUpperCase();
}
