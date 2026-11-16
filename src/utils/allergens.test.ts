import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAllergens, recipeAllergens } from './allergens.ts';
import type { Recipe } from '../types/culinary';

test('detectAllergens flags allergens named in the ingredient', () => {
  assert.deepEqual(detectAllergens('Feta Cheese'), ['Milk']);
  assert.deepEqual(detectAllergens('Eggs'), ['Egg']);
  assert.deepEqual(detectAllergens('Tahini'), ['Sesame']);
  assert.deepEqual(detectAllergens('Salmon Fillet'), ['Fish']);
  assert.deepEqual(detectAllergens('Soy Sauce'), ['Soy']);
  assert.deepEqual(detectAllergens('Almonds'), ['Tree Nut']);
  assert.deepEqual(detectAllergens('Peanut Butter'), ['Peanut']);
});

test('detectAllergens does not false-positive on lookalike names', () => {
  // "eggplant" is not egg; "olive oil" is not an allergen.
  assert.deepEqual(detectAllergens('Eggplant'), []);
  assert.deepEqual(detectAllergens('Olive Oil'), []);
  assert.deepEqual(detectAllergens('Almond Milk'), ['Tree Nut']);
  assert.deepEqual(detectAllergens('Almond Flour'), ['Tree Nut']);
  assert.deepEqual(detectAllergens('Chicken Breast'), []);
  assert.deepEqual(detectAllergens('Organic Baby Spinach'), []);
});

test('recipeAllergens deduplicates across ingredients', () => {
  const recipe = {
    id: 'x',
    title: 'x',
    description: '',
    difficulty: 'Easy',
    prepTimeMinutes: 1,
    cookTimeMinutes: 1,
    calories: 100,
    servings: 1,
    dietaryTags: [],
    ingredients: [
      { name: 'Eggs', amount: '2', essential: true, inFridge: true },
      { name: 'Cheddar Cheese', amount: '50 g', essential: true, inFridge: true },
      { name: 'Milk', amount: '100 ml', essential: true, inFridge: true },
    ],
    steps: [],
  } as Recipe;
  assert.deepEqual(recipeAllergens(recipe), ['Egg', 'Milk']);
});

test('detectAllergens flags Urdu ingredient names (Urdu recipes)', () => {
  assert.deepEqual(detectAllergens('دودھ'), ['Milk']);
  assert.deepEqual(detectAllergens('دہی'), ['Milk']);
  assert.deepEqual(detectAllergens('مکھن'), ['Milk']);
  assert.deepEqual(detectAllergens('انڈے'), ['Egg']);
  assert.deepEqual(detectAllergens('گندم کا آٹا'), ['Wheat']);
  assert.deepEqual(detectAllergens('مونگ پھلی'), ['Peanut']);
  assert.deepEqual(detectAllergens('بادام'), ['Tree Nut']);
  assert.deepEqual(detectAllergens('مچھلی'), ['Fish']);
  assert.deepEqual(detectAllergens('جھینگا'), ['Shellfish']);
  assert.deepEqual(detectAllergens('تل'), ['Sesame']);
  assert.deepEqual(detectAllergens('سرسوں'), ['Mustard']);
  assert.deepEqual(detectAllergens('سیلری'), ['Celery']);
  assert.deepEqual(detectAllergens('سویا ساس'), ['Soy']);
});

test('detectAllergens does not false-positive on Urdu lookalikes', () => {
  // "مونگ کی دال" is moong dal, not peanut — the phrase match needs
  // the full "مونگ پھلی", not the single token "مونگ".
  assert.deepEqual(detectAllergens('مونگ کی دال'), []);
  assert.deepEqual(detectAllergens('چکن تکہ'), []);
  // Almond milk in Urdu: tree nut yes, dairy no.
  assert.deepEqual(detectAllergens('بادام کا دودھ'), ['Tree Nut']);
  assert.deepEqual(detectAllergens('مونگ پھلی کا مکھن'), ['Peanut']);
});
