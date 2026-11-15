/**
 * Client-side image preparation: downscale + compress before upload so
 * phone photos (often 3–8 MB) become a fast ~100–300 KB JPEG. Runs in
 * the browser via canvas — no library needed.
 *
 * Rules (Phase 1 §2A):
 * - Accept JPG / JPEG / PNG / WebP only.
 * - HEIC/HEIF → friendly error (browsers cannot decode it in a canvas).
 * - Original file over the cap → friendly error before any upload.
 * - Output: JPEG data URL, max 1024 px on the long edge, quality 0.82.
 */

import {
  MAX_UPLOAD_FILE_BYTES,
  isAllowedImageMime,
  isHeicFile,
} from './imageValidation.ts';

export const MAX_PREP_DIMENSION = 1024;
export const PREP_JPEG_QUALITY = 0.82;

export type PreparedImage =
  | { ok: true; dataUrl: string; mimeType: 'image/jpeg'; originalBytes: number; preparedBytes: number }
  | { ok: false; error: string };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read this image file.'));
    img.src = src;
  });
}

export async function prepareImageFile(file: File): Promise<PreparedImage> {
  if (isHeicFile(file.name, file.type)) {
    return {
      ok: false,
      error:
        'This photo is in HEIC format (iPhone default), which Mise cannot read yet. Please open it in your Photos app and export or screenshot it as JPG, then upload again.',
    };
  }
  if (!isAllowedImageMime(file.type)) {
    return {
      ok: false,
      error:
        'Only JPG, PNG, and WebP photos are supported. Please choose a photo in one of those formats.',
    };
  }
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    return {
      ok: false,
      error: `This photo is ${(file.size / 1024 / 1024).toFixed(1)} MB — please use a photo under 12 MB.`,
    };
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImage(objectUrl);
      const scale = Math.min(
        1,
        MAX_PREP_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { ok: false, error: 'Your browser could not process this image. Please try another photo.' };
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', PREP_JPEG_QUALITY);
      const preparedBytes = Math.round((dataUrl.length * 3) / 4);
      return {
        ok: true,
        dataUrl,
        mimeType: 'image/jpeg',
        originalBytes: file.size,
        preparedBytes,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return {
      ok: false,
      error: 'Could not read this image file. Please try a different photo.',
    };
  }
}

/** Downscale an existing data URL (e.g. a camera capture) the same way. */
export async function prepareImageDataUrl(
  dataUrl: string,
): Promise<PreparedImage> {
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(
      1,
      MAX_PREP_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { ok: false, error: 'Your browser could not process this image. Please try another photo.' };
    }
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL('image/jpeg', PREP_JPEG_QUALITY);
    return {
      ok: true,
      dataUrl: out,
      mimeType: 'image/jpeg',
      originalBytes: Math.round((dataUrl.length * 3) / 4),
      preparedBytes: Math.round((out.length * 3) / 4),
    };
  } catch {
    return { ok: false, error: 'Could not read this image. Please try a different photo.' };
  }
}

/** Make a small thumbnail (≤512 px) for the persisted scan preview. */
export async function makeThumbnail(dataUrl: string): Promise<string | null> {
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(
      1,
      512 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
}
