/**
 * Cloud sync — the bridge between the app's local state (which today
 * lives in localStorage) and the Supabase tables (see
 * supabase/migrations/0001_mise_core.sql).
 *
 * Design:
 * - All mapping is pure functions (local types <-> cloud rows), so the
 *   shape of the data is unit-testable without a network.
 * - `CloudStore` is the async boundary. `SupabaseCloudStore` talks to
 *   Supabase; `NullCloudStore` is the no-op used when Supabase is not
 *   configured (guest mode keeps working untouched).
 * - Writes are whole-snapshot upserts: the user's data is tiny (a
 *   handful of fridges, ≤5 scans, one shopping list, one meal plan),
 *   so delete-then-insert per table is simpler and safer than diffing.
 *   Local data is NEVER deleted by this module — the local copy stays
 *   as the guest fallback even after a successful upload.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FridgeCategory,
  FridgeIngredient,
  FridgeProfile,
  MealPlan,
  Recipe,
  ScanRecord,
  ShoppingListItem,
} from '../types/culinary.ts';
import {
  loadStored,
  removeStored,
  saveStored,
  STORAGE_KEYS,
  STORAGE_VERSIONS,
} from './storage.ts';
import { getSupabaseClient } from './supabase.ts';

/** Everything the app persists for one user, in local shapes. */
export interface LocalUserData {
  email: string | null;
  fridgeProfiles: FridgeProfile[];
  activeFridgeId: string;
  lastScan: ScanRecord | null;
  scanHistory: ScanRecord[];
  favorites: string[];
  shoppingList: ShoppingListItem[];
  mealPlan: MealPlan;
}

export function emptyLocalUserData(): LocalUserData {
  return {
    email: null,
    fridgeProfiles: [],
    activeFridgeId: '',
    lastScan: null,
    scanHistory: [],
    favorites: [],
    shoppingList: [],
    mealPlan: {},
  };
}

// --- Cloud row shapes (snake_case, as stored in Postgres) --------------

export interface CloudProfileRow {
  id: string;
  email: string | null;
  active_fridge_id: string | null;
  updated_at: string;
}

export interface CloudFridgeProfileRow {
  id: string;
  user_id: string;
  name: string;
  ingredients: FridgeIngredient[];
  created_at: string;
}

export interface CloudScanRow {
  id: string;
  user_id: string;
  scanned_at: number;
  summary: string;
  ingredients: FridgeIngredient[];
  recipes: Recipe[];
  thumbnail: string | null;
}

export interface CloudFavoriteRow {
  user_id: string;
  recipe_id: string;
}

export interface CloudShoppingItemRow {
  id: string;
  user_id: string;
  name: string;
  amount: string;
  category: FridgeCategory | null;
  source_recipe: string | null;
  checked: boolean;
  added_at: number;
}

export interface CloudMealPlanRow {
  user_id: string;
  plan: MealPlan;
  updated_at: string;
}

export interface UploadPayload {
  profile: CloudProfileRow;
  fridges: CloudFridgeProfileRow[];
  scans: CloudScanRow[];
  favorites: CloudFavoriteRow[];
  shoppingItems: CloudShoppingItemRow[];
  mealPlan: CloudMealPlanRow;
}

// --- Pure mappers --------------------------------------------------------

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function profileToRow(
  userId: string,
  email: string | null,
  activeFridgeId: string,
): CloudProfileRow {
  return {
    id: userId,
    email,
    active_fridge_id: activeFridgeId || null,
    updated_at: new Date().toISOString(),
  };
}

export function fridgeProfileToRow(
  userId: string,
  profile: FridgeProfile,
): CloudFridgeProfileRow {
  return {
    id: profile.id,
    user_id: userId,
    name: profile.name,
    ingredients: profile.ingredients,
    created_at: new Date(profile.createdAt).toISOString(),
  };
}

export function rowToFridgeProfile(row: CloudFridgeProfileRow): FridgeProfile {
  return {
    id: row.id,
    name: row.name || 'Fridge',
    ingredients: asArray<FridgeIngredient>(row.ingredients),
    createdAt: row.created_at ? Date.parse(row.created_at) || Date.now() : Date.now(),
  };
}

export function scanToRow(userId: string, scan: ScanRecord): CloudScanRow {
  return {
    id: scan.id,
    user_id: userId,
    scanned_at: scan.scannedAt,
    summary: scan.summary,
    ingredients: scan.ingredients,
    recipes: scan.recipes,
    thumbnail: scan.thumbnail ?? null,
  };
}

export function rowToScan(row: CloudScanRow): ScanRecord {
  return {
    id: row.id,
    scannedAt: row.scanned_at,
    summary: row.summary || '',
    ingredients: asArray<FridgeIngredient>(row.ingredients),
    recipes: asArray<Recipe>(row.recipes),
    thumbnail: row.thumbnail ?? null,
  };
}

export function favoriteToRow(userId: string, recipeId: string): CloudFavoriteRow {
  return { user_id: userId, recipe_id: recipeId };
}

export function shoppingItemToRow(
  userId: string,
  item: ShoppingListItem,
): CloudShoppingItemRow {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    amount: item.amount,
    category: item.category ?? null,
    source_recipe: item.sourceRecipe ?? null,
    checked: item.checked,
    added_at: item.addedAt,
  };
}

export function rowToShoppingItem(row: CloudShoppingItemRow): ShoppingListItem {
  // Optional fields are only set when present, so the round-tripped
  // object has exactly the same keys as the original.
  const item: ShoppingListItem = {
    id: row.id,
    name: row.name,
    amount: row.amount,
    checked: row.checked,
    addedAt: row.added_at,
  };
  if (row.category) item.category = row.category;
  if (row.source_recipe) item.sourceRecipe = row.source_recipe;
  return item;
}

export function mealPlanToRow(userId: string, plan: MealPlan): CloudMealPlanRow {
  return {
    user_id: userId,
    plan,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Build the full upload payload from a local snapshot. The latest scan
 * is merged into the history (deduped by id) so it is stored once.
 */
export function buildUploadPayload(
  userId: string,
  data: LocalUserData,
): UploadPayload {
  const scansById = new Map<string, ScanRecord>();
  for (const scan of data.scanHistory) scansById.set(scan.id, scan);
  if (data.lastScan) scansById.set(data.lastScan.id, data.lastScan);
  return {
    profile: profileToRow(userId, data.email, data.activeFridgeId),
    fridges: data.fridgeProfiles.map((p) => fridgeProfileToRow(userId, p)),
    scans: [...scansById.values()].map((s) => scanToRow(userId, s)),
    favorites: data.favorites.map((id) => favoriteToRow(userId, id)),
    shoppingItems: data.shoppingList.map((item) => shoppingItemToRow(userId, item)),
    mealPlan: mealPlanToRow(userId, data.mealPlan),
  };
}

// --- "Already uploaded" flag (localStorage, versioned like the rest) -----

interface SyncedFlag {
  userId: string;
  syncedAt: number;
}

/** The user id whose local data was already uploaded once, or null. */
export function getSyncedUserId(): string | null {
  const flag = loadStored<SyncedFlag>(
    STORAGE_KEYS.cloudSynced,
    STORAGE_VERSIONS.cloudSynced,
  );
  return flag?.userId ?? null;
}

export function markSynced(userId: string): void {
  saveStored<SyncedFlag>(STORAGE_KEYS.cloudSynced, STORAGE_VERSIONS.cloudSynced, {
    userId,
    syncedAt: Date.now(),
  });
}

export function clearSynced(): void {
  removeStored(STORAGE_KEYS.cloudSynced);
}

// --- Async store boundary ------------------------------------------------

export interface CloudStore {
  readonly available: boolean;
  loadAll(userId: string): Promise<LocalUserData>;
  uploadAll(userId: string, data: LocalUserData): Promise<void>;
}

const CLOUD_ERROR = 'Could not reach your account storage. Your data is still safe on this device.';

function throwIfError(error: { message?: string } | null, context: string): void {
  if (error) {
    // Log the provider detail for debugging, but never surface it.
    console.error(`Cloud sync (${context}) failed:`, error.message || error);
    throw new Error(CLOUD_ERROR);
  }
}

export class SupabaseCloudStore implements CloudStore {
  readonly available = true;
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async loadAll(userId: string): Promise<LocalUserData> {
    const [profilesRes, fridgesRes, scansRes, favoritesRes, shoppingRes, mealPlanRes] =
      await Promise.all([
        this.client.from('profiles').select('*').eq('id', userId).maybeSingle(),
        this.client.from('fridge_profiles').select('*').eq('user_id', userId).order('created_at'),
        this.client.from('scans').select('*').eq('user_id', userId).order('scanned_at', { ascending: false }).limit(10),
        this.client.from('favorites').select('*').eq('user_id', userId),
        this.client.from('shopping_items').select('*').eq('user_id', userId).order('added_at'),
        this.client.from('meal_plans').select('*').eq('user_id', userId).maybeSingle(),
      ]);
    throwIfError(profilesRes.error, 'load profiles');
    throwIfError(fridgesRes.error, 'load fridges');
    throwIfError(scansRes.error, 'load scans');
    throwIfError(favoritesRes.error, 'load favorites');
    throwIfError(shoppingRes.error, 'load shopping list');
    throwIfError(mealPlanRes.error, 'load meal plan');

    const data = emptyLocalUserData();
    const profile = profilesRes.data as CloudProfileRow | null;
    data.email = profile?.email ?? null;
    data.activeFridgeId = profile?.active_fridge_id ?? '';
    data.fridgeProfiles = asArray<CloudFridgeProfileRow>(fridgesRes.data).map(rowToFridgeProfile);
    const scans = asArray<CloudScanRow>(scansRes.data).map(rowToScan);
    data.scanHistory = scans;
    data.lastScan = scans[0] ?? null;
    data.favorites = asArray<CloudFavoriteRow>(favoritesRes.data).map((r) => r.recipe_id);
    data.shoppingList = asArray<CloudShoppingItemRow>(shoppingRes.data).map(rowToShoppingItem);
    const mealPlanRow = mealPlanRes.data as CloudMealPlanRow | null;
    data.mealPlan = (mealPlanRow?.plan ?? {}) as MealPlan;
    return data;
  }

  async uploadAll(userId: string, data: LocalUserData): Promise<void> {
    const payload = buildUploadPayload(userId, data);
    const replaceTable = async (
      table: string,
      rows: Record<string, unknown>[],
    ): Promise<void> => {
      const del = await this.client.from(table).delete().eq('user_id', userId);
      throwIfError(del.error, `upload ${table} (delete)`);
      if (rows.length === 0) return;
      const ins = await this.client.from(table).insert(rows);
      throwIfError(ins.error, `upload ${table} (insert)`);
    };
    await Promise.all([
      (async () => {
        const up = await this.client.from('profiles').upsert(payload.profile);
        throwIfError(up.error, 'upload profile');
      })(),
      replaceTable('fridge_profiles', payload.fridges as unknown as Record<string, unknown>[]),
      replaceTable('scans', payload.scans as unknown as Record<string, unknown>[]),
      replaceTable('favorites', payload.favorites as unknown as Record<string, unknown>[]),
      replaceTable('shopping_items', payload.shoppingItems as unknown as Record<string, unknown>[]),
      (async () => {
        const up = await this.client.from('meal_plans').upsert(payload.mealPlan);
        throwIfError(up.error, 'upload meal plan');
      })(),
    ]);
  }
}

/** No-op store used when Supabase is not configured — guest mode. */
export class NullCloudStore implements CloudStore {
  readonly available = false;

  async loadAll(_userId: string): Promise<LocalUserData> {
    return emptyLocalUserData();
  }

  async uploadAll(_userId: string, _data: LocalUserData): Promise<void> {
    // No account storage configured — local data stays local.
  }
}

export function getCloudStore(client?: SupabaseClient | null): CloudStore {
  const resolved = client ?? getSupabaseClient();
  return resolved ? new SupabaseCloudStore(resolved) : new NullCloudStore();
}
