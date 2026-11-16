import { useMemo } from 'react';
import { CalendarDays, Printer, ShoppingBag, Trash2, X } from 'lucide-react';
import type { MealPlan, Recipe, WeekDay } from '../types/culinary';
import { WEEK_DAYS } from '../types/culinary';
import {
  plannedDays,
  plannedMealCount,
  planMissingIngredients,
  planTotalCalories,
} from '../utils/mealPlan.ts';
import { ServingsScaler } from './ServingsScaler';
import type { UiStrings } from '../utils/i18n.ts';
import { getStrings } from '../utils/i18n.ts';

interface MealPlannerProps {
  plan: MealPlan;
  recipes: Recipe[];
  fridgeNames: string[];
  onSetMeal: (day: WeekDay, recipeId: string, servings: number) => void;
  onClearMeal: (day: WeekDay) => void;
  onClearPlan: () => void;
  onAddPlanToShoppingList: () => void;
  s?: UiStrings;
}

export function MealPlanner({
  plan,
  recipes,
  fridgeNames,
  onSetMeal,
  onClearMeal,
  onClearPlan,
  onAddPlanToShoppingList,
  s = getStrings('en'),
}: MealPlannerProps) {
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const missing = useMemo(
    () => planMissingIngredients(plan, recipes, fridgeNames),
    [plan, recipes, fridgeNames],
  );
  const count = plannedMealCount(plan);
  const weekCalories = planTotalCalories(plan, recipes);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight text-slate-900">
            <CalendarDays className="h-7 w-7 text-emerald-700" aria-hidden="true" />
            {s.mealPlannerTitle}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">{s.mealPlannerIntro}</p>
          <p className="mt-1.5 text-sm text-slate-600 tabular-nums">
            {count} {s.plannedMeals}
            {count > 0 ? ` · ${weekCalories} ${s.weekCalories}` : ''}
            {missing.length > 0 ? ` · ${missing.length} missing items` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {missing.length > 0 ? (
            <button
              type="button"
              onClick={onAddPlanToShoppingList}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span>{s.addPlanToShoppingList}</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>{s.print}</span>
          </button>
          {count > 0 ? (
            <button
              type="button"
              onClick={onClearPlan}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>{s.clearPlan}</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WEEK_DAYS.map((day) => {
          const meal = plan[day];
          const recipe = meal ? byId.get(meal.recipeId) : undefined;
          return (
            <section
              key={day}
              aria-label={`${day} meal plan`}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">{day}</h2>
                {meal ? (
                  <button
                    type="button"
                    onClick={() => onClearMeal(day)}
                    aria-label={`Clear ${day} meal`}
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <label className="sr-only" htmlFor={`meal-${day}`}>
                Choose a recipe for {day}
              </label>
              <select
                id={`meal-${day}`}
                value={meal?.recipeId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    onClearMeal(day);
                    return;
                  }
                  const chosen = byId.get(value);
                  onSetMeal(day, value, meal?.servings || chosen?.servings || 1);
                }}
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              >
                <option value="">{s.chooseRecipe}</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>

              {meal && recipe ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-slate-600 line-clamp-2">{recipe.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ServingsScaler
                      servings={meal.servings}
                      baseServings={recipe.servings}
                      onChange={(n) => onSetMeal(day, meal.recipeId, n)}
                      s={s}
                    />
                    <span className="text-xs text-slate-500 tabular-nums">
                      {recipe.calories * meal.servings} kcal
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">{s.noMealPlanned}</p>
              )}
            </section>
          );
        })}
      </div>

      {plannedDays(plan).length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          {s.mealPlannerIntro}
        </p>
      ) : null}
    </div>
  );
}
