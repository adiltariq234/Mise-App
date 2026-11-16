/**
 * Weekly meal planning — pure helpers over the `MealPlan` type.
 * A plan assigns at most one recipe per day, with the servings it is
 * cooked for. Everything is local: plans live in localStorage, and the
 * shopping-list aggregation reuses the existing merge logic in App.
 */

import type { IngredientItem, MealPlan, PlannedMeal, Recipe, WeekDay } from '../types/culinary.ts';
import { WEEK_DAYS } from '../types/culinary.ts';
import { isIngredientInFridge } from './recipeLogic.ts';
import { scaleAmount } from './amounts.ts';

export { WEEK_DAYS };
export type { WeekDay };

export function emptyMealPlan(): MealPlan {
  return {};
}

export function setMeal(
  plan: MealPlan,
  day: WeekDay,
  recipeId: string,
  servings: number,
): MealPlan {
  const next: MealPlan = { ...plan };
  next[day] = {
    recipeId,
    servings: Math.max(1, Math.min(20, Math.floor(servings) || 1)),
  } as PlannedMeal;
  return next;
}

export function clearMeal(plan: MealPlan, day: WeekDay): MealPlan {
  const next: MealPlan = { ...plan };
  delete next[day];
  return next;
}

export function plannedDays(plan: MealPlan): WeekDay[] {
  return WEEK_DAYS.filter((day) => plan[day] !== undefined);
}

export function plannedMealCount(plan: MealPlan): number {
  return plannedDays(plan).length;
}

/** Total calories for the whole planned week (per-serving kcal × servings). */
export function planTotalCalories(plan: MealPlan, recipes: Recipe[]): number {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  let total = 0;
  for (const day of plannedDays(plan)) {
    const meal = plan[day];
    const recipe = meal ? byId.get(meal.recipeId) : undefined;
    if (recipe && meal) total += recipe.calories * meal.servings;
  }
  return total;
}

export interface PlannedMissingIngredient {
  ingredient: IngredientItem;
  recipeTitle: string;
}

/**
 * Essential ingredients the planned meals need but the fridge does not
 * have, scaled to the planned servings. One entry per recipe that needs
 * it (the shopping list merge in App deduplicates by name). Amounts that
 * cannot be scaled are kept verbatim — see `amounts.ts`.
 */
export function planMissingIngredients(
  plan: MealPlan,
  recipes: Recipe[],
  fridgeNames: string[],
): PlannedMissingIngredient[] {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const out: PlannedMissingIngredient[] = [];
  for (const day of plannedDays(plan)) {
    const meal = plan[day];
    if (!meal) continue;
    const recipe = byId.get(meal.recipeId);
    if (!recipe) continue;
    const factor = meal.servings / Math.max(1, recipe.servings);
    for (const ing of recipe.ingredients) {
      if (!ing.essential) continue;
      if (isIngredientInFridge(ing.name, fridgeNames)) continue;
      out.push({
        ingredient: {
          ...ing,
          amount: scaleAmount(ing.amount, factor).text,
        },
        recipeTitle: recipe.title,
      });
    }
  }
  return out;
}
