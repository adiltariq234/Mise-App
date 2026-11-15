import test from 'node:test';
import assert from 'node:assert/strict';
import { categorizeIngredient } from './categories.ts';

test('categorizeIngredient maps common foods to the right category', () => {
  assert.equal(categorizeIngredient('Eggs'), 'Dairy');
  assert.equal(categorizeIngredient('Eggplant'), 'Vegetables');
  assert.equal(categorizeIngredient('Organic Baby Spinach'), 'Vegetables');
  assert.equal(categorizeIngredient('Cherry Tomatoes'), 'Vegetables');
  assert.equal(categorizeIngredient('Avocado'), 'Fruits');
  assert.equal(categorizeIngredient('Lemons'), 'Fruits');
  assert.equal(categorizeIngredient('Cheddar Cheese'), 'Dairy');
  assert.equal(categorizeIngredient('Greek Yogurt'), 'Dairy');
  assert.equal(categorizeIngredient('Chicken Breast'), 'Meat');
  assert.equal(categorizeIngredient('Salmon Fillet'), 'Seafood');
  assert.equal(categorizeIngredient('Basmati Rice'), 'Grains');
  assert.equal(categorizeIngredient('Chickpeas'), 'Grains');
  assert.equal(categorizeIngredient('Ground Cumin'), 'Spices');
  assert.equal(categorizeIngredient('Olive Oil'), 'Spices');
  assert.equal(categorizeIngredient('Orange Juice'), 'Beverages');
});

test('categorizeIngredient falls back to Other for unknown items', () => {
  assert.equal(categorizeIngredient('Mystery Sauce'), 'Other');
  assert.equal(categorizeIngredient(''), 'Other');
});
