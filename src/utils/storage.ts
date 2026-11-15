/**
 * Safe, versioned localStorage helpers.
 *
 * Every stored value is wrapped as `{ version: number; data: T }` so a
 * future schema change can migrate instead of crashing on stale data.
 * All reads/writes are wrapped in try/catch: private-mode browsers,
 * quota exhaustion, and corrupted JSON must never break the app.
 * Quota errors on write are handled by dropping the oldest history
 * entries first (handled by callers via `trySaveWithFallback`).
 */

export function loadStored<T>(key: string, version: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; data?: T };
    if (parsed && parsed.version === version && 'data' in parsed) {
      return parsed.data as T;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStored<T>(key: string, version: number, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ version, data }));
    return true;
  } catch {
    return false;
  }
}

/** Remove a key without throwing. */
export function removeStored(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

export const STORAGE_KEYS = {
  shoppingList: 'mise_shopping_list_v1',
  fridge: 'mise_fridge_v1',
  lastScan: 'mise_last_scan_v1',
  scanHistory: 'mise_scan_history_v1',
  favorites: 'mise_favorites_v1',
  ttsVoice: 'mise_tts_voice_v1',
} as const;

export const STORAGE_VERSIONS = {
  shoppingList: 1,
  fridge: 1,
  lastScan: 1,
  scanHistory: 1,
  favorites: 1,
  ttsVoice: 1,
} as const;
