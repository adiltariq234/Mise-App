/**
 * Multiple fridges — named profiles, each with its own ingredient list.
 *
 * Profiles are stored in `mise_fridges_v1` (versioned, see storage.ts).
 * First run migrates the old single-list key `mise_fridge_v1` (or the
 * sample fridge when nothing is stored) into one profile called
 * "Home Fridge", so existing users lose nothing. The legacy key is left
 * on disk afterwards as a rollback path; it is no longer written.
 */

import type { FridgeIngredient, FridgeProfile } from '../types/culinary';
import { loadStored, STORAGE_KEYS, STORAGE_VERSIONS } from './storage.ts';

export const DEFAULT_FRIDGE_NAME = 'Home Fridge';

export function makeFridgeProfile(
  name: string,
  ingredients: FridgeIngredient[],
): FridgeProfile {
  const cleanName = name.trim() || DEFAULT_FRIDGE_NAME;
  return {
    id: `fridge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    ingredients,
    createdAt: Date.now(),
  };
}

/** Load profiles, migrating the legacy single fridge on first run.
 * `fallbackIngredients` (the sample fridge, passed by the caller) is used
 * only when nothing is stored anywhere — kept out of this module so it
 * never pulls in image assets. */
export function initialFridgeProfiles(
  fallbackIngredients: FridgeIngredient[],
): FridgeProfile[] {
  const saved = loadStored<FridgeProfile[]>(
    STORAGE_KEYS.fridges,
    STORAGE_VERSIONS.fridges,
  );
  if (saved && saved.length > 0) return saved;
  const legacy = loadStored<FridgeIngredient[]>(
    STORAGE_KEYS.fridge,
    STORAGE_VERSIONS.fridge,
  );
  const ingredients =
    legacy && legacy.length > 0 ? legacy : fallbackIngredients;
  return [makeFridgeProfile(DEFAULT_FRIDGE_NAME, ingredients)];
}

export function addFridgeProfile(
  profiles: FridgeProfile[],
  name: string,
): FridgeProfile[] {
  if (!name.trim()) return profiles;
  return [...profiles, makeFridgeProfile(name, [])];
}

export function renameFridgeProfile(
  profiles: FridgeProfile[],
  id: string,
  name: string,
): FridgeProfile[] {
  const cleanName = name.trim();
  if (!cleanName) return profiles;
  return profiles.map((p) => (p.id === id ? { ...p, name: cleanName } : p));
}

/** Delete a profile — but never the last one. */
export function deleteFridgeProfile(
  profiles: FridgeProfile[],
  id: string,
): FridgeProfile[] {
  if (profiles.length <= 1) return profiles;
  return profiles.filter((p) => p.id !== id);
}

/** Replace one profile's ingredient list (used by all fridge edits). */
export function updateProfileIngredients(
  profiles: FridgeProfile[],
  id: string,
  nextIngredients: FridgeIngredient[],
): FridgeProfile[] {
  return profiles.map((p) =>
    p.id === id ? { ...p, ingredients: nextIngredients } : p,
  );
}
