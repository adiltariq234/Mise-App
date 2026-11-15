/**
 * Friendly error handling for API calls.
 *
 * The server returns `{ error, code? }` where `code` is a stable machine
 * code (AI_BUSY, AI_UNAVAILABLE, AI_TIMEOUT, RATE_LIMITED, VALIDATION,
 * NETWORK). The UI never shows raw provider text or JSON parse errors.
 */

/** Parse an API response safely: non-JSON bodies (e.g. a 502 HTML page)
 * previously crashed `response.json()` and leaked a raw SyntaxError to
 * the user (QA audit, 15 Nov 2026). */
export async function parseApiPayload<T>(
  response: Response,
): Promise<{ ok: boolean; status: number; payload: Partial<T> & { error?: string; code?: string } }> {
  const contentType = response.headers.get('content-type') || '';
  let payload: Partial<T> & { error?: string; code?: string } = {};
  if (contentType.includes('application/json')) {
    try {
      payload = (await response.json()) as Partial<T> & { error?: string; code?: string };
    } catch {
      payload = {};
    }
  }
  return { ok: response.ok, status: response.status, payload };
}

export function friendlyApiError(
  status: number,
  code: string | undefined,
  fallback: string,
): string {
  if (status === 429 || code === 'RATE_LIMITED') {
    return 'You have made a lot of requests in a short time. Please wait a few minutes and try again.';
  }
  if (code === 'AI_BUSY') {
    return 'The AI service is busy right now. Please try again in a minute.';
  }
  if (code === 'AI_TIMEOUT') {
    return 'The AI took too long to respond. Please try again — your photo was not lost.';
  }
  if (code === 'AI_UNAVAILABLE' || status >= 500) {
    return 'The AI service is temporarily unavailable. Please try again in a few minutes.';
  }
  if (code === 'VALIDATION' || status === 400) {
    return 'That request could not be processed. Please check your photo or ingredients and try again.';
  }
  if (status === 404) {
    return 'That request could not be found. Please refresh the page and try again.';
  }
  return fallback;
}

export class ApiTimeoutError extends Error {
  constructor() {
    super('Request timed out.');
    this.name = 'ApiTimeoutError';
  }
}

/** fetch with a hard timeout (AbortController). */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiTimeoutError();
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}
