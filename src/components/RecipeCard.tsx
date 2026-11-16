import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, ChefHat, Heart, Plus } from 'lucide-react';
import type { IngredientItem, Recipe, ShoppingListItem } from '../types/culinary';
import {
  getIngredientCounts,
  isIngredientInShoppingList,
} from '../utils/recipeLogic';
import { scaleRecipe } from '../utils/amounts.ts';
import { recipeAllergens } from '../utils/allergens.ts';
import { ServingsScaler } from './ServingsScaler';
import type { UiStrings } from '../utils/i18n.ts';
import { getStrings } from '../utils/i18n.ts';

interface RecipeCardProps {
  recipe: Recipe;
  shoppingList: ShoppingListItem[];
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
  onAddMissingToShoppingList: (
    ingredient: IngredientItem,
    recipeTitle: string,
  ) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  s?: UiStrings;
}

export function RecipeCard({
  recipe,
  shoppingList,
  isFavorite,
  onToggleFavorite,
  onAddMissingToShoppingList,
  onSelectRecipe,
  s = getStrings('en'),
}: RecipeCardProps) {
  const [showIngredients, setShowIngredients] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [servings, setServings] = useState(recipe.servings);

  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const { total, inFridgeCount, missingEssentials } = getIngredientCounts(recipe);
  // Servings scaling: amounts with a leading number scale; amounts without
  // one are shown as written (see utils/amounts.ts).
  const scaled = useMemo(() => scaleRecipe(recipe, servings), [recipe, servings]);
  const scaledByName = useMemo(
    () => new Map(scaled.ingredients.map((ing) => [ing.name, ing])),
    [scaled],
  );
  const allergens = useMemo(() => recipeAllergens(recipe), [recipe]);
  // Honest imagery only: show a photo only when it genuinely depicts this
  // dish. AI recipes have no imageUrl — they get a clean text-only header
  // instead of a misleading stock photo (QA P0-4).
  const imageSrc = recipe.imageUrl && !imgError ? recipe.imageUrl : null;
  const notYetAdded = missingEssentials.filter(
    (ing) => !isIngredientInShoppingList(ing.name, shoppingList),
  );
  const alreadyAdded = missingEssentials.filter((ing) =>
    isIngredientInShoppingList(ing.name, shoppingList),
  );

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-transform duration-200 hover:-translate-y-0.5">
      {/* 4:3 Dish Photography — only when the photo is real for this dish */}
      {imageSrc ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <img
            src={imageSrc}
            alt={recipe.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onToggleFavorite(recipe)}
            aria-label={isFavorite ? `Remove ${recipe.title} from favourites` : `Save ${recipe.title} to favourites`}
            aria-pressed={isFavorite}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm transition-colors hover:bg-white"
          >
            <Heart
              className={`h-4 w-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`}
              aria-hidden="true"
            />
          </button>
        </div>
      ) : (
        <div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50 p-6 text-center">
          <ChefHat className="h-9 w-9 text-emerald-700/70" aria-hidden="true" />
          <span className="mt-2 font-display text-base font-medium text-slate-700">
            {recipe.title}
          </span>
          {recipe.isAiGenerated ? (
            <span className="mt-1 text-xs text-slate-500">
              AI-generated recipe — photo not available
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onToggleFavorite(recipe)}
            aria-label={isFavorite ? `Remove ${recipe.title} from favourites` : `Save ${recipe.title} to favourites`}
            aria-pressed={isFavorite}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm transition-colors hover:bg-white"
          >
            <Heart
              className={`h-4 w-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`}
              aria-hidden="true"
            />
          </button>
        </div>
      )}

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
            {servings} {servings === 1 ? s.serving : s.servings}
            {servings !== recipe.servings
              ? ` · ${scaled.totalCalories} kcal ${s.totalCalories}`
              : ''}
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

        {/* Allergen flags — from ingredient names only, never inferred. */}
        {allergens.length > 0 ? (
          <p className="mt-2 text-xs">
            <span className="font-medium text-amber-800">{s.contains}: </span>
            <span className="text-amber-900">{allergens.join(', ')}</span>
          </p>
        ) : null}

        {/* Servings scaler */}
        <div className="mt-3">
          <ServingsScaler
            servings={servings}
            baseServings={recipe.servings}
            onChange={setServings}
            s={s}
          />
        </div>

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
          {notYetAdded.length > 0 ? (
            <div className="mt-2.5 space-y-1.5">
              <p className="text-xs font-medium text-amber-800">
                Missing essential{notYetAdded.length > 1 ? 's' : ''}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {notYetAdded.map((ing) => (
                  <button
                    key={ing.name}
                    type="button"
                    onClick={() =>
                      onAddMissingToShoppingList(
                        scaledByName.get(ing.name) || ing,
                        recipe.title,
                      )
                    }
                    aria-label={`Add ${ing.name} to shopping list`}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 whitespace-nowrap transition-colors hover:border-amber-300 hover:bg-amber-100"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Add {ing.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : missingEssentials.length === 0 ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">
              All essential ingredients ready in fridge
            </p>
          ) : null}

          {alreadyAdded.length > 0 ? (
            <p className="mt-2 text-xs text-emerald-700">
              In your shopping list:{' '}
              {alreadyAdded.map((ing) => ing.name).join(', ')}
            </p>
          ) : null}

          {/* Expandable Full Ingredient Breakdown — amounts scaled to the
              chosen servings; unscalable amounts shown as written. */}
          {showIngredients ? (
            <>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">{s.nutrition}</p>
                <p className="mt-0.5 tabular-nums">
                  {recipe.calories} {s.caloriesPerServing}
                  {servings !== recipe.servings
                    ? ` · ${scaled.totalCalories} kcal ${s.totalCalories}`
                    : ''}
                </p>
                {recipe.nutrition ? (
                  <p className="mt-0.5 tabular-nums">
                    {recipe.nutrition.proteinGrams !== undefined
                      ? `Protein ${recipe.nutrition.proteinGrams} g · `
                      : ''}
                    {recipe.nutrition.carbsGrams !== undefined
                      ? `Carbs ${recipe.nutrition.carbsGrams} g · `
                      : ''}
                    {recipe.nutrition.fatGrams !== undefined
                      ? `Fat ${recipe.nutrition.fatGrams} g`
                      : ''}
                  </p>
                ) : (
                  <p className="mt-0.5 text-slate-500">{s.macrosNotProvided}</p>
                )}
              </div>
              {scaled.unscaledCount > 0 ? (
                <p className="mt-2 text-xs text-slate-500">{s.notScalableNote}</p>
              ) : null}
              <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                {scaled.ingredients.map((ing) => {
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
                      <span className="text-slate-500">({ing.scaledAmount})</span>
                    </span>
                    {ing.inFridge ? (
                      <span className="text-emerald-700 shrink-0">In fridge</span>
                    ) : (
                      <button
                        type="button"
                        disabled={inList}
                        onClick={() =>
                          onAddMissingToShoppingList(
                            { ...ing, amount: ing.scaledAmount },
                            recipe.title,
                          )
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
            </>
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
