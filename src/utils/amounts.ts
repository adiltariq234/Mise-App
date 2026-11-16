/**
 * Structured ingredient amounts.
 *
 * Recipe amounts arrive as free text ("3 large", "1/2 sliced",
 * "1 can drained"). This parser extracts a leading quantity when one
 * exists so the UI can scale amounts with the servings stepper.
 *
 * Honesty rule: amounts with no leading number ("a pinch", "to taste",
 * "1-2 cloves" — a range) cannot be scaled honestly, so they are shown
 * exactly as written (`scalable: false`). The UI says so instead of
 * guessing a number.
 */

import type { IngredientItem, Recipe } from '../types/culinary';

export interface ParsedAmount {
  /** Numeric quantity, or null when the text has no leading number. */
  quantity: number | null;
  /** The unit word after the quantity ("g", "cups", "can"), or ''. */
  unit: string;
  /** Everything after quantity + unit, e.g. "sliced", "drained", "large". */
  qualifier: string;
  /** True only when a leading number was found. */
  scalable: boolean;
}

/** Unicode fraction characters, for amounts like "½ cup". */
const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

/** Words recognised as a unit when they follow the quantity. Anything else
 * is treated as a qualifier ("3 large" → quantity 3, qualifier "large"). */
const KNOWN_UNITS = new Set([
  'g', 'kg', 'mg', 'ml', 'l', 'dl', 'oz', 'lb',
  'cup', 'cups', 'tbsp', 'tsp', 'pinch', 'pinches',
  'can', 'cans', 'bunch', 'bunches', 'clove', 'cloves',
  'sprig', 'sprigs', 'slice', 'slices', 'piece', 'pieces',
  'fillet', 'fillets', 'stalk', 'stalks', 'head', 'heads',
  'scoop', 'scoops', 'sheet', 'sheets', 'jar', 'jars',
  'bottle', 'bottles', 'pack', 'packs', 'handful', 'handfuls',
]);

/** Countable units that take a plural when the scaled quantity exceeds 1
 * ("1 can" → "2 cans"). Abbreviations and size words never pluralize. */
const PLURAL_FORMS = new Map<string, string>([
  ['can', 'cans'],
  ['bunch', 'bunches'],
  ['clove', 'cloves'],
  ['sprig', 'sprigs'],
  ['slice', 'slices'],
  ['piece', 'pieces'],
  ['fillet', 'fillets'],
  ['stalk', 'stalks'],
  ['head', 'heads'],
  ['scoop', 'scoops'],
  ['sheet', 'sheets'],
  ['jar', 'jars'],
  ['bottle', 'bottles'],
  ['pack', 'packs'],
  ['pinch', 'pinches'],
  ['cup', 'cups'],
]);

const SINGULAR_FORMS = new Map<string, string>(
  [...PLURAL_FORMS.entries()].map(([singular, plural]) => [plural, singular]),
);

/**
 * Parse the leading quantity out of a free-text amount.
 * Returns `scalable: false` (quantity null) when no leading number exists.
 */
export function parseAmount(amount: string): ParsedAmount {
  const text = amount.trim();
  const notScalable: ParsedAmount = {
    quantity: null,
    unit: '',
    qualifier: text,
    scalable: false,
  };
  if (!text) return notScalable;

  // A range ("1-2 cloves") has no single quantity — do not guess.
  if (/^\d+\s*-\s*\d+/.test(text)) return notScalable;

  let quantity: number | null = null;
  let rest = text;

  // Mixed number: "1 1/2 cups"
  let m = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\b\s*(.*)$/);
  if (m) {
    const den = Number(m[3]);
    if (den > 0) {
      quantity = Number(m[1]) + Number(m[2]) / den;
      rest = m[4] || '';
    }
  }
  // Simple fraction: "1/2 cup"
  if (quantity === null) {
    m = text.match(/^(\d+)\s*\/\s*(\d+)\b\s*(.*)$/);
    if (m) {
      const den = Number(m[2]);
      if (den > 0) {
        quantity = Number(m[1]) / den;
        rest = m[3] || '';
      }
    }
  }
  // Unicode fraction, optionally after an integer: "½ cup", "1½ cups".
  // Note: no \b after the fraction character — it is a non-word character,
  // so a word boundary never occurs between it and the following space.
  if (quantity === null) {
    m = text.match(/^(\d+)?\s*([¼½¾⅓⅔⅛⅜⅝⅞])\s*(.*)$/);
    if (m) {
      quantity = (m[1] ? Number(m[1]) : 0) + UNICODE_FRACTIONS[m[2]];
      rest = m[3] || '';
    }
  }
  // Plain integer / decimal: "3", "1.5"
  if (quantity === null) {
    m = text.match(/^(\d+(?:\.\d+)?)\b\s*(.*)$/);
    if (m) {
      quantity = Number(m[1]);
      rest = m[2] || '';
    }
  }

  if (quantity === null) return notScalable;

  const parts = rest.trim().split(/\s+/).filter(Boolean);
  const firstWord = (parts[0] || '').toLowerCase();
  if (parts.length > 0 && KNOWN_UNITS.has(firstWord)) {
    return {
      quantity,
      unit: firstWord,
      qualifier: parts.slice(1).join(' '),
      scalable: true,
    };
  }
  return { quantity, unit: '', qualifier: rest.trim(), scalable: true };
}

/** Common fractions rendered as kitchen-friendly text. */
const FRACTION_TEXT: Array<[number, string]> = [
  [0.25, '1/4'],
  [1 / 3, '1/3'],
  [0.5, '1/2'],
  [2 / 3, '2/3'],
  [0.75, '3/4'],
];

function formatFractionalPart(frac: number): string | null {
  for (const [value, text] of FRACTION_TEXT) {
    if (Math.abs(frac - value) < 0.01) return text;
  }
  return null;
}

/** Render a quantity the way a recipe would: "1/2", "1 1/2", "2.5". */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value) || value < 0) return String(value);
  const whole = Math.floor(value);
  const frac = value - whole;
  if (frac < 0.01) return String(whole);
  const fracText = formatFractionalPart(frac);
  if (fracText) return whole > 0 ? `${whole} ${fracText}` : fracText;
  // Otherwise one decimal, without trailing ".0".
  const rounded = Math.round(value * 10) / 10;
  return String(rounded);
}

function adjustUnitPlural(unit: string, quantity: number): string {
  if (!unit) return unit;
  const plural = PLURAL_FORMS.get(unit);
  if (plural && quantity > 1) return plural;
  const singular = SINGULAR_FORMS.get(unit);
  if (singular && Math.abs(quantity - 1) < 0.01) return singular;
  return unit;
}

export interface ScaledAmount {
  /** The amount text to display. */
  text: string;
  /** False when the amount has no quantity and was shown unscaled. */
  scalable: boolean;
}

/**
 * Scale a free-text amount by a factor. A factor of 1 returns the original
 * text unchanged. Unscalable amounts are returned verbatim.
 */
export function scaleAmount(amount: string, factor: number): ScaledAmount {
  if (factor === 1) {
    const parsed = parseAmount(amount);
    return { text: amount, scalable: parsed.scalable };
  }
  const parsed = parseAmount(amount);
  if (!parsed.scalable || parsed.quantity === null) {
    return { text: amount, scalable: false };
  }
  const scaledQty = parsed.quantity * factor;
  const unit = adjustUnitPlural(parsed.unit, scaledQty);
  const parts = [formatQuantity(scaledQty), unit, parsed.qualifier].filter(
    Boolean,
  );
  return { text: parts.join(' '), scalable: true };
}

export interface ScaledIngredient extends IngredientItem {
  /** Amount text after scaling to the target servings. */
  scaledAmount: string;
  /** False when this item has no quantity and was shown unscaled. */
  scalable: boolean;
}

export interface ScaledRecipe {
  ingredients: ScaledIngredient[];
  /** How many ingredients could not be scaled (no quantity in the text). */
  unscaledCount: number;
  /** Total calories for the target servings (per-serving kcal × servings). */
  totalCalories: number;
}

/**
 * Scale a recipe's ingredients to a target serving count. Per-serving
 * calories do not change — only the total does.
 */
export function scaleRecipe(recipe: Recipe, targetServings: number): ScaledRecipe {
  const factor = targetServings / Math.max(1, recipe.servings);
  const ingredients = recipe.ingredients.map((ing) => {
    const scaled = scaleAmount(ing.amount, factor);
    return { ...ing, scaledAmount: scaled.text, scalable: scaled.scalable };
  });
  return {
    ingredients,
    unscaledCount: ingredients.filter((i) => !i.scalable).length,
    totalCalories: Math.round(recipe.calories * targetServings),
  };
}
