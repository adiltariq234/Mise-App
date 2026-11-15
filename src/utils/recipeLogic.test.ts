import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createShoppingItemFromIngredient,
  filterAndSortRecipes,
  formatTimerSeconds,
  getIngredientCounts,
  isIngredientInFridge,
  isIngredientInShoppingList,
  mergeShoppingListItem,
  recalculateRecipeAvailability,
} from './recipeLogic';
import type { Recipe, ShoppingListItem } from '../types/culinary';

const sampleRecipes: Recipe[] = [
  {
    id: 'r1',
    title: 'Spinach & Feta Omelette',
    description: 'Fluffy folded eggs with wilted spinach and feta.',
    difficulty: 'Easy',
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    calories: 380,
    servings: 1,
    dietaryTags: ['Vegetarian', 'Keto', 'Gluten-Free', 'High-Protein'],
    ingredients: [
      { name: 'Eggs', amount: '3 large', essential: true, inFridge: true },
      { name: 'Baby Spinach', amount: '1 cup', essential: true, inFridge: true },
      { name: 'Feta Cheese', amount: '40 g', essential: true, inFridge: false },
    ],
    steps: [{ stepNumber: 1, instruction: 'Whisk eggs.' }],
  },
  {
    id: 'r2',
    title: 'Mediterranean Chickpea Bowl',
    description: 'Roasted spiced chickpeas over greens with tahini.',
    difficulty: 'Medium',
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    calories: 510,
    servings: 2,
    dietaryTags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free'],
    ingredients: [
      { name: 'Chickpeas', amount: '1 can', essential: true, inFridge: false },
      { name: 'Baby Spinach', amount: '2 cups', essential: true, inFridge: true },
      { name: 'Cherry Tomatoes', amount: '1 cup', essential: false, inFridge: true },
    ],
    steps: [{ stepNumber: 1, instruction: 'Roast chickpeas.' }],
  },
];

test('isIngredientInFridge matches substrings and ignores punctuation/case', () => {
  const fridge = ['Organic Eggs', 'Fresh Baby Spinach', 'Cherry Tomatoes'];
  assert.equal(isIngredientInFridge('eggs', fridge), true);
  assert.equal(isIngredientInFridge('Baby Spinach', fridge), true);
  assert.equal(isIngredientInFridge('Feta Cheese', fridge), false);
});

test('recalculateRecipeAvailability updates inFridge dynamically when fridge contents change', () => {
  const updated = recalculateRecipeAvailability(sampleRecipes, ['Eggs', 'Feta Cheese']);
  const counts = getIngredientCounts(updated[0]);
  assert.equal(counts.inFridgeCount, 2);
  assert.equal(counts.missingEssentials.length, 1);
  assert.equal(counts.missingEssentials[0].name, 'Baby Spinach');
});

test('filterAndSortRecipes filters by multiple dietary restrictions, time, difficulty, and search', () => {
  const ketoOnly = filterAndSortRecipes(sampleRecipes, {
    dietary: ['Keto'],
    maxPrepTime: null,
    difficulty: 'All',
    searchQuery: '',
  });
  assert.equal(ketoOnly.length, 1);
  assert.equal(ketoOnly[0].id, 'r1');

  const veganQuick = filterAndSortRecipes(sampleRecipes, {
    dietary: ['Vegan'],
    maxPrepTime: 20,
    difficulty: 'All',
    searchQuery: '',
  });
  assert.equal(veganQuick.length, 0);

  const searchChickpea = filterAndSortRecipes(sampleRecipes, {
    dietary: [],
    maxPrepTime: null,
    difficulty: 'All',
    searchQuery: 'chickpea',
  });
  assert.equal(searchChickpea.length, 1);
  assert.equal(searchChickpea[0].id, 'r2');
});

test('mergeShoppingListItem prevents duplicates and unchecks re-added items', () => {
  const item1 = createShoppingItemFromIngredient(
    { name: 'Feta Cheese', amount: '40 g', essential: true, inFridge: false },
    'Spinach & Feta Omelette',
  );
  const checkedItem: ShoppingListItem = { ...item1, checked: true };
  const item2 = createShoppingItemFromIngredient(
    { name: 'feta cheese', amount: '100 g', essential: true, inFridge: false },
    'Greek Salad',
  );

  const merged = mergeShoppingListItem([checkedItem], item2);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].checked, false);
  assert.equal(
    merged[0].sourceRecipe,
    'Spinach & Feta Omelette, Greek Salad',
  );
  assert.equal(isIngredientInShoppingList('Feta Cheese', merged), true);
});

test('formatTimerSeconds formats mm:ss cleanly', () => {
  assert.equal(formatTimerSeconds(0), '00:00');
  assert.equal(formatTimerSeconds(65), '01:05');
  assert.equal(formatTimerSeconds(600), '10:00');
  assert.equal(formatTimerSeconds(-5), '00:00');
});
