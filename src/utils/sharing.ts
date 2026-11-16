/**
 * Family sharing — local-only export / import.
 *
 * There is no backend and no account, so "sharing" means: the app packs a
 * copy of a fridge, the shopping list and the meal plan into a short code
 * (base64url JSON) that can be sent as a link (`#share=<code>`) or pasted
 * as text. The receiver imports a COPY into their own browser.
 *
 * Honest limits, shown in the UI: anyone with the link can import it;
 * there is no live sync (changes after sharing are not shared); there are
 * no permissions or per-person views. Live multi-user sharing needs a
 * backend with accounts — this is the honest local version until then.
 */

import type {
  FridgeIngredient,
  MealPlan,
  ShoppingListItem,
} from '../types/culinary';

export interface SharePayload {
  v: 1;
  kind: 'mise-share';
  exportedAt: number;
  fridge?: { name: string; ingredients: FridgeIngredient[] };
  shoppingList?: ShoppingListItem[];
  mealPlan?: MealPlan;
}

/** Links stay short enough to paste or text: refuse payloads over ~200 KB. */
const MAX_ENCODED_CHARS = 200_000;

export function buildSharePayload(input: {
  fridge?: { name: string; ingredients: FridgeIngredient[] };
  shoppingList?: ShoppingListItem[];
  mealPlan?: MealPlan;
}): SharePayload {
  return {
    v: 1,
    kind: 'mise-share',
    exportedAt: Date.now(),
    ...(input.fridge ? { fridge: input.fridge } : {}),
    ...(input.shoppingList && input.shoppingList.length > 0
      ? { shoppingList: input.shoppingList }
      : {}),
    ...(input.mealPlan && Object.keys(input.mealPlan).length > 0
      ? { mealPlan: input.mealPlan }
      : {}),
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(code: string): Uint8Array | null {
  try {
    const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Encode a payload to a share code, or null when it is too large. */
export function encodeShare(payload: SharePayload): string | null {
  try {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    const code = bytesToBase64Url(bytes);
    return code.length > MAX_ENCODED_CHARS ? null : code;
  } catch {
    return null;
  }
}

export type DecodeShareResult =
  | { ok: true; payload: SharePayload }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Decode and validate a share code. Never throws. */
export function decodeShare(code: string): DecodeShareResult {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: 'The share code is empty.' };
  if (trimmed.length > MAX_ENCODED_CHARS) {
    return { ok: false, error: 'This share code is too long to import.' };
  }
  const bytes = base64UrlToBytes(trimmed);
  if (!bytes) {
    return { ok: false, error: 'This does not look like a Mise share code.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, error: 'This share code could not be read.' };
  }
  if (!isRecord(parsed) || parsed.v !== 1 || parsed.kind !== 'mise-share') {
    return { ok: false, error: 'This is not a Mise share code.' };
  }
  // Validate the shapes we will actually import; drop anything malformed.
  if (parsed.fridge !== undefined) {
    if (
      !isRecord(parsed.fridge) ||
      typeof parsed.fridge.name !== 'string' ||
      !Array.isArray(parsed.fridge.ingredients) ||
      parsed.fridge.ingredients.length > 500 ||
      parsed.fridge.ingredients.some(
        (i) => !isRecord(i) || typeof i.name !== 'string' || !i.name.trim(),
      )
    ) {
      return { ok: false, error: 'The shared fridge data is invalid.' };
    }
  }
  if (parsed.shoppingList !== undefined) {
    if (
      !Array.isArray(parsed.shoppingList) ||
      parsed.shoppingList.length > 500 ||
      parsed.shoppingList.some(
        (i) => !isRecord(i) || typeof i.name !== 'string' || !i.name.trim(),
      )
    ) {
      return { ok: false, error: 'The shared shopping list is invalid.' };
    }
  }
  if (parsed.mealPlan !== undefined && !isRecord(parsed.mealPlan)) {
    return { ok: false, error: 'The shared meal plan is invalid.' };
  }
  return { ok: true, payload: parsed as unknown as SharePayload };
}
