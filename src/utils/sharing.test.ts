import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSharePayload,
  encodeShare,
  decodeShare,
} from './sharing.ts';

test('encode/decode round-trips a fridge + shopping list + meal plan', () => {
  const payload = buildSharePayload({
    fridge: {
      name: 'Home Fridge',
      ingredients: [
        {
          id: 'eggs-1',
          name: 'Eggs',
          category: 'Dairy',
          source: 'manual',
          addedAt: 1,
        },
      ],
    },
    shoppingList: [
      {
        id: 'feta-1',
        name: 'Feta Cheese',
        amount: '40 g',
        checked: false,
        addedAt: 1,
      },
    ],
    mealPlan: { Monday: { recipeId: 'omelette', servings: 2 } },
  });
  const code = encodeShare(payload);
  assert.ok(code);
  assert.ok(!code.includes('+') && !code.includes('/') && !code.includes('='));
  const decoded = decodeShare(code);
  assert.equal(decoded.ok, true);
  if (decoded.ok) {
    assert.equal(decoded.payload.fridge?.name, 'Home Fridge');
    assert.equal(decoded.payload.shoppingList?.length, 1);
    assert.deepEqual(decoded.payload.mealPlan, {
      Monday: { recipeId: 'omelette', servings: 2 },
    });
  }
});

test('decodeShare rejects garbage, wrong kinds and tampered payloads', () => {
  assert.equal(decodeShare('').ok, false);
  assert.equal(decodeShare('not-a-share-code!!!').ok, false);
  const wrongKind = Buffer.from(
    JSON.stringify({ v: 1, kind: 'something-else' }),
  ).toString('base64url');
  assert.equal(decodeShare(wrongKind).ok, false);
  const badFridge = Buffer.from(
    JSON.stringify({
      v: 1,
      kind: 'mise-share',
      exportedAt: 1,
      fridge: { name: 'x', ingredients: [{ name: '' }] },
    }),
  ).toString('base64url');
  assert.equal(decodeShare(badFridge).ok, false);
});

test('buildSharePayload omits empty sections', () => {
  const payload = buildSharePayload({});
  assert.equal(payload.fridge, undefined);
  assert.equal(payload.shoppingList, undefined);
  assert.equal(payload.mealPlan, undefined);
});
