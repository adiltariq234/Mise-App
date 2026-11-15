/**
 * Pure image-validation helpers, shared by the browser (pre-upload) and
 * the server (defence in depth). No DOM or Node APIs here, so the same
 * code can be unit-tested with plain node --test.
 */

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

/** Max decoded image size accepted by the server (8 MB). */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Max original file size the client will attempt to process (12 MB —
 * compression usually shrinks it well below the server cap). */
export const MAX_UPLOAD_FILE_BYTES = 12 * 1024 * 1024;

export function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime);
}

/** Detect HEIC/HEIF by extension or MIME — browsers cannot decode it in
 * a canvas, so it gets a friendly message instead of a silent failure. */
export function isHeicFile(fileName: string, mime: string): boolean {
  const lowerName = fileName.toLowerCase();
  return (
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif') ||
    mime === 'image/heic' ||
    mime === 'image/heif'
  );
}

/**
 * Identify an image format from its magic bytes. Returns the MIME or
 * null when the bytes do not match a supported format. This is the
 * server-side check — the client-supplied MIME string is never trusted.
 */
export function detectImageMime(bytes: Uint8Array): AllowedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
    bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
    bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
    bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 &&
    bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

/** Rough decoded byte count for a base64 string (without decoding it). */
export function estimateBase64Bytes(base64: string): number {
  const clean = base64.replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}
