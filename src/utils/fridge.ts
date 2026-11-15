import type { FridgeIngredient, FridgeCategory } from '../types/culinary';
import { normalizeIngredientName } from './recipeLogic.ts';
import { categorizeIngredient } from './categories.ts';

export function makeFridgeIngredient(
  name: string,
  source: 'scan' | 'manual',
  opts: { quantity?: string; category?: FridgeCategory; expiresAt?: string | null } = {},
): FridgeIngredient {
  const cleanName = name.trim();
  return {
    id: `${normalizeIngredientName(cleanName)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    quantity: opts.quantity?.trim() || undefined,
    category: opts.category || categorizeIngredient(cleanName),
    source,
    addedAt: Date.now(),
    expiresAt: opts.expiresAt ?? null,
  };
}

/** Convert AI-detected ingredient names into inventory items. */
export function fromScanNames(names: string[]): FridgeIngredient[] {
  return names
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
    .map((n) => makeFridgeIngredient(n, 'scan'));
}

/** Merge scanned items into the existing inventory, deduplicating by
 * normalized name and keeping the existing item (with its category and
 * quantity) when a name is already present. */
export function mergeScannedIngredients(
  current: FridgeIngredient[],
  scanned: FridgeIngredient[],
): FridgeIngredient[] {
  const byName = new Map(current.map((i) => [normalizeIngredientName(i.name), i]));
  const merged = [...current];
  for (const item of scanned) {
    if (!byName.has(normalizeIngredientName(item.name))) {
      byName.set(normalizeIngredientName(item.name), item);
      merged.push(item);
    }
  }
  return merged;
}

export function addFridgeIngredient(
  current: FridgeIngredient[],
  name: string,
  opts: { quantity?: string; category?: FridgeCategory; expiresAt?: string | null } = {},
): FridgeIngredient[] {
  const normalized = normalizeIngredientName(name);
  if (!normalized) return current;
  if (current.some((i) => normalizeIngredientName(i.name) === normalized)) {
    return current;
  }
  return [makeFridgeIngredient(name, 'manual', opts), ...current];
}

export function updateFridgeIngredient(
  current: FridgeIngredient[],
  id: string,
  patch: Partial<Pick<FridgeIngredient, 'name' | 'quantity' | 'category' | 'expiresAt'>>,
): FridgeIngredient[] {
  return current.map((item) => {
    if (item.id !== id) return item;
    const next = { ...item, ...patch };
    if (patch.name !== undefined) {
      next.name = patch.name.trim() || item.name;
      if (!patch.category) next.category = categorizeIngredient(next.name);
    }
    return next;
  });
}

export function removeFridgeIngredient(
  current: FridgeIngredient[],
  id: string,
): FridgeIngredient[] {
  return current.filter((item) => item.id !== id);
}

/** Names only, for the recipe-availability matcher and the AI prompt. */
export function fridgeIngredientNames(items: FridgeIngredient[]): string[] {
  return items.map((i) => i.name);
}

/** Items whose expiry date is within `withinDays` (and not past). */
export function expiringSoon(
  items: FridgeIngredient[],
  withinDays = 3,
  now = new Date(),
): FridgeIngredient[] {
  const limit = new Date(now);
  limit.setDate(limit.getDate() + withinDays);
  return items.filter((i) => {
    if (!i.expiresAt) return false;
    const d = new Date(`${i.expiresAt}T23:59:59`);
    return d >= now && d <= limit;
  });
}
