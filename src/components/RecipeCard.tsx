import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, ChefHat, Plus } from 'lucide-react';
import type { IngredientItem, Recipe, ShoppingListItem } from '../types/culinary';
import {
  getIngredientCounts,
  isIngredientInShoppingList,
} from '../utils/recipeLogic';
import { FALLBACK_DISH_IMAGES } from '../data/seedData';

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  shoppingList: ShoppingListItem[];
  onAddMissingToShoppingList: (
    ingredient: IngredientItem,
    recipeTitle: string,
  ) => void;
  onSelectRecipe: (recipe: Recipe) => void;
}

export function RecipeCard({
  recipe,
  index,
  shoppingList,
  onAddMissingToShoppingList,
  onSelectRecipe,
}: RecipeCardProps) {
  const [showIngredients, setShowIngredients] = useState(false);
  const [imgError, setImgError] = useState(false);

  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const { total, inFridgeCount, missingEssentials } = getIngredientCounts(recipe);
  const imageSrc = recipe.imageUrl || FALLBACK_DISH_IMAGES[index];

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-transform duration-200 hover:-translate-y-0.5">
      {/* 4:3 Dish Photography */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {!imgError && imageSrc ? (
          <img
            src={imageSrc}
            alt={recipe.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50 p-6 text-center">
            <ChefHat className="h-9 w-9 text-emerald-700/70" aria-hidden="true" />
            <span className="mt-2 font-display text-base font-medium text-slate-700">
              {recipe.title}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Clean Unboxed Metadata */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500 tabular-nums">
          <span className="text-slate-700">{recipe.difficulty}</span>
          <span aria-hidden="true">·</span>
          <span>{totalTime} min total</span>
          <span aria-hidden="true">·</span>
          <span>{recipe.calories} kcal</span>
          <span aria-hidden="true">·</span>
          <span>
            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
          </span>
        </div>

        <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-slate-900">
          {recipe.title}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {recipe.description}
        </p>

        {recipe.dietaryTags.length > 0 ? (
          <p className="mt-2.5 text-xs text-slate-500">
            {recipe.dietaryTags.join(' · ')}
          </p>
        ) : null}

        {/* Ingredient Match & One-Click Missing Essentials */}
        <div className="mt-4 border-t border-slate-100 pt-3.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-700 tabular-nums">
              {inFridgeCount} of {total} ingredients in fridge
            </span>
            <button
              type="button"
              aria-expanded={showIngredients}
              onClick={() => setShowIngredients((prev) => !prev)}
              className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
            >
              <span>{showIngredients ? 'Hide list' : 'Ingredients'}</span>
              {showIngredients ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Missing Essential Ingredients One-Click Add */}
          {missingEssentials.length > 0 ? (
            <div className="mt-2.5 space-y-1.5">
              <p className="text-xs font-medium text-amber-800">
                Missing essential{missingEssentials.length > 1 ? 's' : ''}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingEssentials.map((ing) => {
                  const alreadyAdded = isIngredientInShoppingList(
                    ing.name,
                    shoppingList,
                  );
                  return (
                    <button
                      key={ing.name}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() =>
                        onAddMissingToShoppingList(ing, recipe.title)
                      }
                      aria-label={
                        alreadyAdded
                          ? `${ing.name} already in shopping list`
                          : `Add ${ing.name} to shopping list`
                      }
                      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        alreadyAdded
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {alreadyAdded ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {alreadyAdded ? `${ing.name} added` : `Add ${ing.name}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs font-medium text-emerald-700">
              All essential ingredients ready in fridge
            </p>
          )}

          {/* Expandable Full Ingredient Breakdown */}
          {showIngredients ? (
            <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
              {recipe.ingredients.map((ing) => {
                const inList = isIngredientInShoppingList(
                  ing.name,
                  shoppingList,
                );
                return (
                  <li
                    key={ing.name}
                    className="flex items-center justify-between gap-2 text-slate-700"
                  >
                    <span className="truncate">
                      <span
                        className={
                          ing.inFridge ? 'text-slate-900' : 'text-amber-900'
                        }
                      >
                        {ing.name}
                      </span>{' '}
                      <span className="text-slate-500">({ing.amount})</span>
                    </span>
                    {ing.inFridge ? (
                      <span className="text-emerald-700 shrink-0">In fridge</span>
                    ) : (
                      <button
                        type="button"
                        disabled={inList}
                        onClick={() =>
                          onAddMissingToShoppingList(ing, recipe.title)
                        }
                        className="font-medium text-amber-800 hover:text-amber-950 shrink-0 disabled:text-emerald-700"
                      >
                        {inList ? 'In list' : '+ Add'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        {/* Primary Action */}
        <div className="mt-5 pt-1">
          <button
            type="button"
            onClick={() => onSelectRecipe(recipe)}
            aria-label={`Start cooking ${recipe.title}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <ChefHat className="h-4 w-4" aria-hidden="true" />
            <span>Start Cooking</span>
          </button>
        </div>
      </div>
    </article>
  );
}
