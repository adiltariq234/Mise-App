import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addFridgeProfile,
  deleteFridgeProfile,
  initialFridgeProfiles,
  renameFridgeProfile,
  updateProfileIngredients,
} from './fridges.ts';
import { fromScanNames } from './fridge.ts';
import type { FridgeProfile } from '../types/culinary';

function twoProfiles(): FridgeProfile[] {
  return [
    {
      id: 'a',
      name: 'Home Fridge',
      ingredients: fromScanNames(['Eggs']),
      createdAt: 1,
    },
    { id: 'b', name: 'Garage Fridge', ingredients: [], createdAt: 2 },
  ];
}

test('initialFridgeProfiles falls back to the sample fridge when nothing is stored', () => {
  // Node has no localStorage: loadStored returns null, so the fallback wins.
  const profiles = initialFridgeProfiles(fromScanNames(['Eggs', 'Milk']));
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].name, 'Home Fridge');
  assert.equal(profiles[0].ingredients.length, 2);
});

test('addFridgeProfile appends an empty profile', () => {
  const next = addFridgeProfile(twoProfiles(), 'Office Fridge');
  assert.equal(next.length, 3);
  assert.equal(next[2].name, 'Office Fridge');
  assert.deepEqual(next[2].ingredients, []);
  assert.equal(addFridgeProfile(twoProfiles(), '   ').length, 2);
});

test('renameFridgeProfile renames only the target profile', () => {
  const next = renameFridgeProfile(twoProfiles(), 'b', 'Basement Fridge');
  assert.equal(next[1].name, 'Basement Fridge');
  assert.equal(next[0].name, 'Home Fridge');
  assert.equal(renameFridgeProfile(twoProfiles(), 'b', '  ').length, 2);
  assert.equal(renameFridgeProfile(twoProfiles(), 'b', '  ')[1].name, 'Garage Fridge');
});

test('deleteFridgeProfile never deletes the last profile', () => {
  const one = [twoProfiles()[0]];
  assert.equal(deleteFridgeProfile(one, 'a').length, 1);
  const next = deleteFridgeProfile(twoProfiles(), 'b');
  assert.equal(next.length, 1);
  assert.equal(next[0].id, 'a');
});

test('updateProfileIngredients replaces only the target list', () => {
  const next = updateProfileIngredients(
    twoProfiles(),
    'b',
    fromScanNames(['Milk']),
  );
  assert.equal(next[1].ingredients.length, 1);
  assert.equal(next[1].ingredients[0].name, 'Milk');
  assert.equal(next[0].ingredients.length, 1);
  assert.equal(next[0].ingredients[0].name, 'Eggs');
});
