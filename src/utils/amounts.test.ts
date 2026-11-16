import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAmount,
  scaleAmount,
  formatQuantity,
  scaleRecipe,
} from './amounts.ts';
import type { Recipe } from '../types/culinary';

test('parseAmount extracts quantity, unit and qualifier', () => {
  assert.deepEqual(parseAmount('3 large'), {
    quantity: 3,
    unit: '',
    qualifier: 'large',
    scalable: true,
  });
  assert.deepEqual(parseAmount('450 g'), {
    quantity: 450,
    unit: 'g',
    qualifier: '',
    scalable: true,
  });
  assert.deepEqual(parseAmount('1/2 sliced'), {
    quantity: 0.5,
    unit: '',
    qualifier: 'sliced',
    scalable: true,
  });
  assert.deepEqual(parseAmount('1 1/2 cups halved'), {
    quantity: 1.5,
    unit: 'cups',
    qualifier: 'halved',
    scalable: true,
  });
  assert.deepEqual(parseAmount('½ cup'), {
    quantity: 0.5,
    unit: 'cup',
    qualifier: '',
    scalable: true,
  });
  assert.deepEqual(parseAmount('40 g crumbled'), {
    quantity: 40,
    unit: 'g',
    qualifier: 'crumbled',
    scalable: true,
  });
});

test('parseAmount refuses to scale amounts with no number or a range', () => {
  const pinch = parseAmount('a pinch');
  assert.equal(pinch.scalable, false);
  assert.equal(pinch.quantity, null);
  const range = parseAmount('1-2 cloves');
  assert.equal(range.scalable, false);
  const taste = parseAmount('to taste');
  assert.equal(taste.scalable, false);
});

test('scaleAmount scales numbers and pluralizes countable units', () => {
  assert.deepEqual(scaleAmount('3 large', 2), { text: '6 large', scalable: true });
  assert.deepEqual(scaleAmount('450 g', 2), { text: '900 g', scalable: true });
  assert.deepEqual(scaleAmount('1 can drained', 2), {
    text: '2 cans drained',
    scalable: true,
  });
  assert.deepEqual(scaleAmount('2 cups', 0.5), { text: '1 cup', scalable: true });
  assert.deepEqual(scaleAmount('1/2 sliced', 2), { text: '1 sliced', scalable: true });
  assert.deepEqual(scaleAmount('1 tbsp', 3), { text: '3 tbsp', scalable: true });
  // Factor 1 returns the original text verbatim.
  assert.deepEqual(scaleAmount('3 large', 1), { text: '3 large', scalable: true });
});

test('scaleAmount leaves unscalable amounts verbatim', () => {
  assert.deepEqual(scaleAmount('a pinch', 3), { text: 'a pinch', scalable: false });
  assert.deepEqual(scaleAmount('1-2 cloves', 2), {
    text: '1-2 cloves',
    scalable: false,
  });
});

test('formatQuantity renders kitchen-friendly fractions', () => {
  assert.equal(formatQuantity(0.5), '1/2');
  assert.equal(formatQuantity(1.5), '1 1/2');
  assert.equal(formatQuantity(0.25), '1/4');
  assert.equal(formatQuantity(2), '2');
  assert.equal(formatQuantity(2.5), '2 1/2');
  assert.equal(formatQuantity(0.75), '3/4');
});

const TEST_RECIPE: Recipe = {
  id: 'test',
  title: 'Test',
  description: '',
  difficulty: 'Easy',
  prepTimeMinutes: 5,
  cookTimeMinutes: 5,
  calories: 400,
  servings: 2,
  dietaryTags: [],
  ingredients: [
    { name: 'Eggs', amount: '3 large', essential: true, inFridge: true },
    { name: 'Salt', amount: 'a pinch', essential: false, inFridge: true },
  ],
  steps: [],
};

test('scaleRecipe scales scalable amounts and reports unscaled ones', () => {
  const scaled = scaleRecipe(TEST_RECIPE, 4);
  assert.equal(scaled.ingredients[0].scaledAmount, '6 large');
  assert.equal(scaled.ingredients[0].scalable, true);
  assert.equal(scaled.ingredients[1].scaledAmount, 'a pinch');
  assert.equal(scaled.ingredients[1].scalable, false);
  assert.equal(scaled.unscaledCount, 1);
  // Per-serving calories stay the same; only the total changes.
  assert.equal(scaled.totalCalories, 1600);
});
