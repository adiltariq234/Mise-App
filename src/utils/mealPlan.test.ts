import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMealPlan,
  setMeal,
  clearMeal,
  plannedDays,
  plannedMealCount,
  planTotalCalories,
  planMissingIngredients,
} from './mealPlan.ts';
import type { Recipe } from '../types/culinary';

const RECIPES: Recipe[] = [
  {
    id: 'omelette',
    title: 'Omelette',
    description: '',
    difficulty: 'Easy',
    prepTimeMinutes: 5,
    cookTimeMinutes: 8,
    calories: 400,
    servings: 1,
    dietaryTags: [],
    ingredients: [
      { name: 'Eggs', amount: '3 large', essential: true, inFridge: true },
      { name: 'Feta Cheese', amount: '40 g', essential: true, inFridge: false },
    ],
    steps: [],
  },
  {
    id: 'salad',
    title: 'Salad',
    description: '',
    difficulty: 'Easy',
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    calories: 200,
    servings: 2,
    dietaryTags: [],
    ingredients: [
      { name: 'Cherry Tomatoes', amount: '1 cup', essential: true, inFridge: true },
    ],
    steps: [],
  },
];

test('setMeal and clearMeal manage one recipe per day', () => {
  let plan = emptyMealPlan();
  assert.equal(plannedMealCount(plan), 0);
  plan = setMeal(plan, 'Monday', 'omelette', 2);
  assert.equal(plannedMealCount(plan), 1);
  assert.deepEqual(plannedDays(plan), ['Monday']);
  assert.deepEqual(plan.Monday, { recipeId: 'omelette', servings: 2 });
  // Replacing a day overwrites it; servings clamp to 1..20.
  plan = setMeal(plan, 'Monday', 'salad', 99);
  assert.deepEqual(plan.Monday, { recipeId: 'salad', servings: 20 });
  plan = clearMeal(plan, 'Monday');
  assert.equal(plannedMealCount(plan), 0);
});

test('planTotalCalories uses per-serving kcal times planned servings', () => {
  let plan = emptyMealPlan();
  plan = setMeal(plan, 'Monday', 'omelette', 2); // 400 * 2
  plan = setMeal(plan, 'Tuesday', 'salad', 3); // 200 * 3
  assert.equal(planTotalCalories(plan, RECIPES), 1400);
});

test('planMissingIngredients returns only missing essentials, scaled', () => {
  const plan = setMeal(emptyMealPlan(), 'Monday', 'omelette', 2);
  // Eggs are in the fridge; feta is missing and scales 1 -> 2 servings.
  const missing = planMissingIngredients(plan, RECIPES, ['Eggs']);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].ingredient.name, 'Feta Cheese');
  assert.equal(missing[0].ingredient.amount, '80 g');
  assert.equal(missing[0].recipeTitle, 'Omelette');
  // Nothing missing when everything is in the fridge.
  const none = planMissingIngredients(plan, RECIPES, ['Eggs', 'Feta Cheese']);
  assert.equal(none.length, 0);
});
