import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUploadPayload,
  clearSynced,
  emptyLocalUserData,
  getSyncedUserId,
  markSynced,
  NullCloudStore,
  getCloudStore,
  rowToFridgeProfile,
  fridgeProfileToRow,
  rowToScan,
  scanToRow,
  rowToShoppingItem,
  shoppingItemToRow,
  type LocalUserData,
} from './cloudSync.ts';
import type {
  FridgeProfile,
  MealPlan,
  ScanRecord,
  ShoppingListItem,
} from '../types/culinary.ts';

const USER_ID = '00000000-0000-0000-0000-000000000001';

function sampleData(): LocalUserData {
  const fridge: FridgeProfile = {
    id: 'fridge-1',
    name: 'Home Fridge',
    ingredients: [
      { id: 'i1', name: 'Eggs', quantity: '6', category: 'Dairy', source: 'scan', addedAt: 1000 },
    ],
    createdAt: 1000,
  };
  const scan: ScanRecord = {
    id: 'scan-1',
    scannedAt: 2000,
    summary: 'Eggs and spinach',
    ingredients: fridge.ingredients,
    recipes: [
      {
        id: 'r1',
        title: 'Omelette',
        description: 'Quick omelette',
        difficulty: 'Easy',
        prepTimeMinutes: 5,
        cookTimeMinutes: 5,
        calories: 250,
        servings: 1,
        dietaryTags: [],
        ingredients: [{ name: 'Eggs', amount: '2', essential: true, inFridge: true }],
        steps: [{ stepNumber: 1, instruction: 'Beat the eggs.' }],
      },
    ],
    thumbnail: null,
  };
  const item: ShoppingListItem = {
    id: 's1',
    name: 'Spinach',
    amount: '200 g',
    category: 'Vegetables',
    checked: false,
    addedAt: 3000,
  };
  const plan: MealPlan = { Monday: { recipeId: 'r1', servings: 2 } };
  return {
    email: 'adil@example.com',
    fridgeProfiles: [fridge],
    activeFridgeId: 'fridge-1',
    lastScan: scan,
    scanHistory: [scan],
    favorites: ['r1'],
    shoppingList: [item],
    mealPlan: plan,
  };
}

test('fridge profile rows round-trip without loss', () => {
  const data = sampleData();
  const row = fridgeProfileToRow(USER_ID, data.fridgeProfiles[0]);
  assert.equal(row.user_id, USER_ID);
  assert.equal(row.name, 'Home Fridge');
  assert.deepEqual(rowToFridgeProfile(row), data.fridgeProfiles[0]);
});

test('scan rows round-trip, including recipes and ingredients', () => {
  const data = sampleData();
  const row = scanToRow(USER_ID, data.lastScan!);
  assert.equal(row.user_id, USER_ID);
  assert.equal(row.scanned_at, 2000);
  assert.deepEqual(rowToScan(row), data.lastScan);
});

test('shopping item rows round-trip, keeping optional fields', () => {
  const data = sampleData();
  const row = shoppingItemToRow(USER_ID, data.shoppingList[0]);
  assert.equal(row.category, 'Vegetables');
  assert.equal(row.source_recipe, null);
  const back = rowToShoppingItem(row);
  assert.deepEqual(back, data.shoppingList[0]);
});

test('rowToFridgeProfile and rowToScan tolerate corrupt JSONB', () => {
  const badFridge = rowToFridgeProfile({
    id: 'f',
    user_id: USER_ID,
    name: '',
    ingredients: 'not-an-array' as never,
    created_at: 'garbage',
  });
  assert.deepEqual(badFridge.ingredients, []);
  assert.equal(badFridge.name, 'Fridge');
  const badScan = rowToScan({
    id: 's',
    user_id: USER_ID,
    scanned_at: 1,
    summary: '',
    ingredients: null as never,
    recipes: null as never,
    thumbnail: null,
  });
  assert.deepEqual(badScan.ingredients, []);
  assert.deepEqual(badScan.recipes, []);
});

test('buildUploadPayload dedupes the last scan out of the history', () => {
  const data = sampleData();
  const payload = buildUploadPayload(USER_ID, data);
  assert.equal(payload.profile.id, USER_ID);
  assert.equal(payload.profile.email, 'adil@example.com');
  assert.equal(payload.profile.active_fridge_id, 'fridge-1');
  assert.equal(payload.fridges.length, 1);
  assert.equal(payload.scans.length, 1); // lastScan == history[0]
  assert.equal(payload.favorites.length, 1);
  assert.equal(payload.favorites[0].recipe_id, 'r1');
  assert.equal(payload.shoppingItems.length, 1);
  assert.deepEqual(payload.mealPlan.plan, { Monday: { recipeId: 'r1', servings: 2 } });
});

test('buildUploadPayload handles empty local data', () => {
  const payload = buildUploadPayload(USER_ID, emptyLocalUserData());
  assert.equal(payload.fridges.length, 0);
  assert.equal(payload.scans.length, 0);
  assert.equal(payload.favorites.length, 0);
  assert.equal(payload.shoppingItems.length, 0);
  assert.equal(payload.profile.active_fridge_id, null);
});

test('synced flag helpers never throw without a browser (Node)', () => {
  // localStorage does not exist under node --test; the storage
  // helpers swallow that and the flag reads as "not synced".
  assert.equal(getSyncedUserId(), null);
  markSynced(USER_ID);
  clearSynced();
  assert.equal(getSyncedUserId(), null);
});

test('NullCloudStore is inert and getCloudStore picks it when unconfigured', async () => {
  const store = getCloudStore(null);
  assert.equal(store.available, false);
  assert.ok(store instanceof NullCloudStore);
  const data = await store.loadAll(USER_ID);
  assert.deepEqual(data, emptyLocalUserData());
  await store.uploadAll(USER_ID, sampleData());
});
