/**
 * Allergen flags, derived only from ingredient names.
 *
 * The data has no allergen field, so flags come from a conservative
 * keyword list matched on whole words ("egg" flags "Eggs" but not
 * "eggplant"; "flour" flags wheat only when no alternative flour is
 * named). Nothing is inferred from a dish name or a cuisine — if the
 * ingredient list does not name an allergen, no flag is shown and the UI
 * says the check is limited to the listed ingredients. Always check the
 * actual product label.
 */

import type { Recipe } from '../types/culinary';

export type Allergen =
  | 'Milk'
  | 'Egg'
  | 'Wheat'
  | 'Peanut'
  | 'Tree Nut'
  | 'Soy'
  | 'Fish'
  | 'Shellfish'
  | 'Sesame'
  | 'Mustard'
  | 'Celery';

const ALLERGEN_KEYWORDS: Record<Allergen, string[]> = {
  Milk: [
    'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'feta',
    'mozzarella', 'cheddar', 'parmesan', 'ghee', 'paneer', 'whey', 'kefir',
    // Urdu (recipes generated in Urdu carry Urdu ingredient names).
    'دودھ', 'پنیر', 'مکھن', 'کریم', 'دہی', 'گھی', 'چیز', 'موزاریلا',
    'چیڈر', 'پارمیزن',
  ],
  Egg: ['egg', 'eggs', 'انڈا', 'انڈے'],
  Wheat: [
    'wheat', 'flour', 'bread', 'pasta', 'couscous', 'barley', 'rye', 'semolina',
    'گندم', 'آٹا', 'میدہ', 'روٹی', 'پاستا', 'سوجی', 'جو', 'رائی',
  ],
  Peanut: ['peanut', 'peanuts'],
  'Tree Nut': [
    'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews',
    'pistachio', 'pistachios', 'hazelnut', 'hazelnuts', 'pecan', 'pecans',
    'macadamia',
    'بادام', 'اخروٹ', 'کاجو', 'پستہ', 'پیکان',
  ],
  Soy: ['soy', 'tofu', 'edamame', 'tempeh', 'سویا', 'ٹوفو', 'ایڈامیمے'],
  Fish: [
    'salmon', 'tuna', 'cod', 'trout', 'sardine', 'sardines', 'anchovy',
    'anchovies', 'fish', 'mackerel', 'halibut', 'sea bass',
    'مچھلی', 'سالمن', 'ٹونا', 'کوڈ',
  ],
  Shellfish: [
    'shrimp', 'prawn', 'prawns', 'crab', 'lobster', 'mussel', 'mussels',
    'clam', 'clams', 'oyster', 'oysters', 'scallop', 'scallops',
    'جھینگا', 'کیکڑا', 'لابسٹر',
  ],
  Sesame: ['sesame', 'tahini', 'تل', 'تہینی'],
  Mustard: ['mustard', 'سرسوں'],
  Celery: ['celery', 'سیلری'],
};

/**
 * Multi-word allergens matched as phrases on the normalized name
 * ("مونگ پھلی" is peanut; the single tokens "مونگ"/"پھلی" alone are not —
 * "مونگ کی دال" is moong dal, not peanut).
 */
const PHRASE_KEYWORDS: Array<{ allergen: Allergen; phrase: string }> = [
  { allergen: 'Peanut', phrase: 'مونگ پھلی' },
  { allergen: 'Tree Nut', phrase: 'ہیزل نٹ' },
];

/**
 * Phrases that look like an allergen keyword but are not the allergen
 * ("almond milk" has no dairy; "almond flour" has no wheat). Checked as
 * whole phrases on the normalized name before keyword matching.
 */
const EXCLUSIONS: Array<{ allergen: Allergen; phrase: string }> = [
  { allergen: 'Milk', phrase: 'almond milk' },
  { allergen: 'Milk', phrase: 'oat milk' },
  { allergen: 'Milk', phrase: 'soy milk' },
  { allergen: 'Milk', phrase: 'coconut milk' },
  { allergen: 'Milk', phrase: 'cashew milk' },
  { allergen: 'Wheat', phrase: 'almond flour' },
  { allergen: 'Wheat', phrase: 'coconut flour' },
  { allergen: 'Wheat', phrase: 'rice flour' },
  { allergen: 'Wheat', phrase: 'chickpea flour' },
  { allergen: 'Wheat', phrase: 'oat flour' },
  { allergen: 'Milk', phrase: 'peanut butter' },
  { allergen: 'Milk', phrase: 'almond butter' },
  { allergen: 'Milk', phrase: 'cashew butter' },
  // Urdu equivalents of the same exclusions.
  { allergen: 'Milk', phrase: 'بادام کا دودھ' },
  { allergen: 'Milk', phrase: 'سویا دودھ' },
  { allergen: 'Milk', phrase: 'ناریل کا دودھ' },
  { allergen: 'Milk', phrase: 'کاجو کا دودھ' },
  { allergen: 'Wheat', phrase: 'بادام کا آٹا' },
  { allergen: 'Wheat', phrase: 'ناریل کا آٹا' },
  { allergen: 'Wheat', phrase: 'چاول کا آٹا' },
  { allergen: 'Wheat', phrase: 'چنے کا آٹا' },
  { allergen: 'Wheat', phrase: 'جئی کا آٹا' },
  { allergen: 'Milk', phrase: 'مونگ پھلی کا مکھن' },
  { allergen: 'Milk', phrase: 'بادام کا مکھن' },
  { allergen: 'Milk', phrase: 'کاجو کا مکھن' },
];

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    // Keep letters/numbers from any script (Urdu included) — the old
    // [^a-z0-9] class stripped Urdu text to nothing, so no allergen
    // could ever match an Urdu ingredient name.
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Allergens flagged for one ingredient name, or [] when none match. */
export function detectAllergens(ingredientName: string): Allergen[] {
  const normalized = normalizeName(ingredientName);
  if (!normalized) return [];
  const tokens = new Set(
    normalized
      .split(' ')
      .filter(Boolean)
      .map((t) => t.replace(/s$/, '')),
  );
  const found: Allergen[] = [];
  for (const allergen of Object.keys(ALLERGEN_KEYWORDS) as Allergen[]) {
    if (EXCLUSIONS.some((e) => e.allergen === allergen && normalized.includes(e.phrase))) {
      continue;
    }
    const hit =
      ALLERGEN_KEYWORDS[allergen].some((keyword) => {
        const key = keyword.replace(/s$/, '');
        return tokens.has(key);
      }) ||
      PHRASE_KEYWORDS.some(
        (p) => p.allergen === allergen && normalized.includes(p.phrase),
      );
    if (hit) found.push(allergen);
  }
  return found;
}

/** Deduplicated allergens across a recipe's ingredient list. */
export function recipeAllergens(recipe: Recipe): Allergen[] {
  const found = new Set<Allergen>();
  for (const ing of recipe.ingredients) {
    for (const allergen of detectAllergens(ing.name)) {
      found.add(allergen);
    }
  }
  return [...found];
}
