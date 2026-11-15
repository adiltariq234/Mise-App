import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectImageMime,
  estimateBase64Bytes,
  isAllowedImageMime,
  isHeicFile,
} from './imageValidation.ts';

test('detectImageMime identifies JPEG, PNG, and WebP from magic bytes', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  assert.equal(detectImageMime(jpeg), 'image/jpeg');

  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(detectImageMime(png), 'image/png');

  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
  ]);
  assert.equal(detectImageMime(webp), 'image/webp');
});

test('detectImageMime rejects garbage and non-image bytes', () => {
  assert.equal(detectImageMime(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])), null);
  assert.equal(detectImageMime(new Uint8Array([])), null);
  // GIF is not in the allowlist
  const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  assert.equal(detectImageMime(gif), null);
});

test('isAllowedImageMime only accepts jpg/png/webp', () => {
  assert.equal(isAllowedImageMime('image/jpeg'), true);
  assert.equal(isAllowedImageMime('image/png'), true);
  assert.equal(isAllowedImageMime('image/webp'), true);
  assert.equal(isAllowedImageMime('image/gif'), false);
  assert.equal(isAllowedImageMime('image/heic'), false);
  assert.equal(isAllowedImageMime('text/html'), false);
});

test('isHeicFile catches HEIC/HEIF by extension or MIME', () => {
  assert.equal(isHeicFile('IMG_1234.HEIC', 'image/heic'), true);
  assert.equal(isHeicFile('photo.heif', 'image/jpeg'), true);
  assert.equal(isHeicFile('photo.jpg', 'image/jpeg'), false);
  assert.equal(isHeicFile('photo.png', 'image/png'), false);
});

test('estimateBase64Bytes approximates the decoded size', () => {
  // "Hello" -> "SGVsbG8=" (5 bytes)
  assert.equal(estimateBase64Bytes('SGVsbG8='), 5);
  assert.equal(estimateBase64Bytes('aGVsbG8gd29ybGQ='), 11);
});
