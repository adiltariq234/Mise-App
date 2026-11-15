import type {
  FilterState,
  FridgeIngredient,
  IngredientItem,
  Recipe,
  ShoppingListItem,
} from '../types/culinary';
import { categorizeIngredient } from './categories.ts';

export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The fridge can be stored as inventory objects or plain names. */
export type FridgeInput = FridgeIngredient[] | string[];

function fridgeNames(input: FridgeInput): string[] {
  return input.map((i) => (typeof i === 'string' ? i : i.name));
}

/**
 * Whole-word matching: the ingredient name matches when its tokens are
 * a subset of a fridge item's tokens (or vice versa). This fixes the old
 * substring false-positives — "corn" no longer matches "popcorn", "oil"
 * no longer matches "olive oil" unless "olive oil" is the target itself.
 * Plural handling: a trailing "s" is stripped from each token.
 */
export function isIngredientInFridge(
  ingredientName: string,
  fridgeIngredients: FridgeInput,
): boolean {
  const targetTokens = new Set(
    normalizeIngredientName(ingredientName)
      .split(' ')
      .filter(Boolean)
      .map((t) => t.replace(/s$/, '')),
  );
  if (targetTokens.size === 0) return false;

  return fridgeNames(fridgeIngredients).some((item) => {
    const candidateTokens = new Set(
      normalizeIngredientName(item)
        .split(' ')
        .filter(Boolean)
        .map((t) => t.replace(/s$/, '')),
    );
    if (candidateTokens.size === 0) return false;
    const targetInCandidate = [...targetTokens].every((t) =>
      candidateTokens.has(t),
    );
    const candidateInTarget = [...candidateTokens].every((t) =>
      targetTokens.has(t),
    );
    return targetInCandidate || candidateInTarget;
  });
}

export function recalculateRecipeAvailability(
  recipes: Recipe[],
  fridgeIngredients: FridgeInput,
): Recipe[] {
  return recipes.map((recipe) => ({
    ...recipe,
    ingredients: recipe.ingredients.map((ing) => ({
      ...ing,
      inFridge: isIngredientInFridge(ing.name, fridgeIngredients),
    })),
  }));
}

export function getIngredientCounts(recipe: Recipe): {
  total: number;
  inFridgeCount: number;
  missingEssentials: IngredientItem[];
  missingOptional: IngredientItem[];
  matchRatio: number;
} {
  const total = recipe.ingredients.length;
  const inFridgeCount = recipe.ingredients.filter((i) => i.inFridge).length;
  const missingEssentials = recipe.ingredients.filter(
    (i) => !i.inFridge && i.essential,
  );
  const missingOptional = recipe.ingredients.filter(
    (i) => !i.inFridge && !i.essential,
  );
  const matchRatio = total === 0 ? 1 : inFridgeCount / total;
  return {
    total,
    inFridgeCount,
    missingEssentials,
    missingOptional,
    matchRatio,
  };
}

export function filterAndSortRecipes(
  recipes: Recipe[],
  filters: FilterState,
): Recipe[] {
  const query = filters.searchQuery.trim().toLowerCase();

  const filtered = recipes.filter((recipe) => {
    if (filters.dietary.length > 0) {
      const hasAllDietary = filters.dietary.every((req) =>
        recipe.dietaryTags.includes(req),
      );
      if (!hasAllDietary) return false;
    }

    if (
      filters.maxPrepTime !== null &&
      recipe.prepTimeMinutes + recipe.cookTimeMinutes > filters.maxPrepTime
    ) {
      return false;
    }

    if (
      filters.difficulty !== 'All' &&
      recipe.difficulty !== filters.difficulty
    ) {
      return false;
    }

    if (query) {
      const matchesTitle = recipe.title.toLowerCase().includes(query);
      const matchesDesc = recipe.description.toLowerCase().includes(query);
      const matchesIngredient = recipe.ingredients.some((i) =>
        i.name.toLowerCase().includes(query),
      );
      if (!matchesTitle && !matchesDesc && !matchesIngredient) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    const aStats = getIngredientCounts(a);
    const bStats = getIngredientCounts(b);
    if (bStats.matchRatio !== aStats.matchRatio) {
      return bStats.matchRatio - aStats.matchRatio;
    }
    return (
      a.prepTimeMinutes +
      a.cookTimeMinutes -
      (b.prepTimeMinutes + b.cookTimeMinutes)
    );
  });
}

export function createShoppingItemFromIngredient(
  ingredient: IngredientItem,
  recipeTitle: string,
): ShoppingListItem {
  return {
    id: `${normalizeIngredientName(ingredient.name)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: ingredient.name.trim(),
    amount: ingredient.amount.trim() || '1 unit',
    category: categorizeIngredient(ingredient.name),
    sourceRecipe: recipeTitle,
    checked: false,
    addedAt: Date.now(),
  };
}

export function mergeShoppingListItem(
  list: ShoppingListItem[],
  newItem: ShoppingListItem,
): ShoppingListItem[] {
  const normalizedTarget = normalizeIngredientName(newItem.name);
  const existingIndex = list.findIndex(
    (item) => normalizeIngredientName(item.name) === normalizedTarget,
  );

  if (existingIndex === -1) {
    return [newItem, ...list];
  }

  return list.map((item, idx) => {
    if (idx !== existingIndex) return item;
    const sources = new Set(
      [item.sourceRecipe, newItem.sourceRecipe].filter(Boolean),
    );
    return {
      ...item,
      checked: false,
      amount: item.amount || newItem.amount,
      sourceRecipe: Array.from(sources).join(', ') || undefined,
    };
  });
}

export function isIngredientInShoppingList(
  ingredientName: string,
  shoppingList: ShoppingListItem[],
): boolean {
  const target = normalizeIngredientName(ingredientName);
  return shoppingList.some(
    (item) => normalizeIngredientName(item.name) === target && !item.checked,
  );
}

export function formatTimerSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
