import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addFridgeIngredient,
  fromScanNames,
  mergeScannedIngredients,
  removeFridgeIngredient,
  updateFridgeIngredient,
  fridgeIngredientNames,
  expiringSoon,
} from './fridge.ts';

test('fromScanNames converts AI names into categorized inventory items', () => {
  const items = fromScanNames(['Eggs', 'Organic Baby Spinach', 'Chicken Breast']);
  assert.equal(items.length, 3);
  assert.equal(items[0].name, 'Eggs');
  assert.equal(items[0].source, 'scan');
  assert.equal(items[1].category, 'Vegetables');
  assert.equal(items[2].category, 'Meat');
  assert.ok(items.every((i) => i.id.length > 0));
});

test('addFridgeIngredient deduplicates by normalized name', () => {
  const items = fromScanNames(['Eggs']);
  const added = addFridgeIngredient(items, '  EGGS  ');
  assert.equal(added.length, 1);
  const added2 = addFridgeIngredient(items, 'Milk', { quantity: '1 L', category: 'Dairy' });
  assert.equal(added2.length, 2);
  assert.equal(added2[0].name, 'Milk');
  assert.equal(added2[0].quantity, '1 L');
  assert.equal(added2[0].source, 'manual');
});

test('updateFridgeIngredient edits name, quantity, category, and expiry', () => {
  const items = fromScanNames(['Milk']);
  const id = items[0].id;
  const updated = updateFridgeIngredient(items, id, {
    name: 'Oat Milk',
    quantity: '500 ml',
    category: 'Beverages',
    expiresAt: '2026-11-20',
  });
  assert.equal(updated[0].name, 'Oat Milk');
  assert.equal(updated[0].quantity, '500 ml');
  assert.equal(updated[0].category, 'Beverages');
  assert.equal(updated[0].expiresAt, '2026-11-20');
  // Updating an unknown id leaves the list unchanged.
  assert.deepEqual(updateFridgeIngredient(items, 'nope', { name: 'X' }), items);
});

test('removeFridgeIngredient removes only the named item', () => {
  const items = fromScanNames(['Eggs', 'Milk', 'Spinach']);
  const id = items[1].id;
  const next = removeFridgeIngredient(items, id);
  assert.equal(next.length, 2);
  assert.deepEqual(fridgeIngredientNames(next), ['Eggs', 'Spinach']);
});

test('mergeScannedIngredients keeps existing items and adds new ones', () => {
  const current = addFridgeIngredient(fromScanNames(['Eggs']), 'Milk', { category: 'Dairy' });
  const scanned = fromScanNames(['Eggs', 'Chicken Breast']);
  const merged = mergeScannedIngredients(current, scanned);
  assert.equal(merged.length, 3);
  // The manual Milk item is preserved.
  assert.ok(merged.some((i) => i.name === 'Milk' && i.source === 'manual'));
  // Eggs is not duplicated.
  assert.equal(merged.filter((i) => i.name === 'Eggs').length, 1);
});

test('expiringSoon flags items expiring within the window', () => {
  const now = new Date('2026-11-15T12:00:00');
  const items = [
    ...fromScanNames(['Eggs']),
    {
      id: 'x1',
      name: 'Milk',
      category: 'Dairy' as const,
      source: 'manual' as const,
      addedAt: Date.now(),
      expiresAt: '2026-11-17',
    },
    {
      id: 'x2',
      name: 'Yogurt',
      category: 'Dairy' as const,
      source: 'manual' as const,
      addedAt: Date.now(),
      expiresAt: '2026-12-01',
    },
  ];
  const soon = expiringSoon(items, 3, now);
  assert.equal(soon.length, 1);
  assert.equal(soon[0].name, 'Milk');
});
