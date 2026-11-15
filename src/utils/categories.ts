import type { FridgeCategory } from '../types/culinary';

export const FRIDGE_CATEGORIES: FridgeCategory[] = [
  'Vegetables',
  'Fruits',
  'Dairy',
  'Meat',
  'Seafood',
  'Grains',
  'Spices',
  'Beverages',
  'Other',
];

/** Keyword map used to auto-categorize scanned ingredient names. */
const CATEGORY_KEYWORDS: Array<{ category: FridgeCategory; words: string[] }> = [
  {
    category: 'Vegetables',
    words: [
      'spinach', 'tomato', 'tomatoes', 'pepper', 'peppers', 'zucchini',
      'carrot', 'carrots', 'onion', 'onions', 'garlic', 'potato', 'potatoes',
      'cucumber', 'lettuce', 'cabbage', 'broccoli', 'cauliflower', 'celery',
      'mushroom', 'mushrooms', 'asparagus', 'eggplant', 'okra', 'peas',
      'beans', 'corn', 'beetroot', 'radish', 'turnip', 'leek', 'ginger',
      'chili', 'chilli', 'capsicum', 'basil', 'cilantro', 'parsley', 'dill',
      'mint', 'thyme', 'rosemary', 'sage', 'greens', 'kale', 'salad',
    ],
  },
  {
    category: 'Fruits',
    words: [
      'apple', 'apples', 'banana', 'bananas', 'lemon', 'lemons', 'lime',
      'limes', 'orange', 'oranges', 'avocado', 'mango', 'mangoes', 'berry',
      'berries', 'strawberry', 'blueberry', 'grape', 'grapes', 'peach',
      'peaches', 'pear', 'pears', 'plum', 'plums', 'kiwi', 'melon',
      'watermelon', 'pineapple', 'papaya', 'cherry', 'cherries', 'fig',
      'figs', 'date', 'dates', 'coconut', 'pomegranate',
    ],
  },
  {
    category: 'Dairy',
    words: [
      'milk', 'cheese', 'cheddar', 'feta', 'mozzarella', 'parmesan', 'butter',
      'yogurt', 'yoghurt', 'cream', 'ghee', 'paneer', 'cottage', 'curd',
      'kefir', 'whey', 'egg', 'eggs',
    ],
  },
  {
    category: 'Meat',
    words: [
      'chicken', 'beef', 'lamb', 'mutton', 'pork', 'turkey', 'duck', 'bacon',
      'sausage', 'ham', 'steak', 'mince', 'meatballs', 'salami', 'pepperoni',
    ],
  },
  {
    category: 'Seafood',
    words: [
      'salmon', 'tuna', 'fish', 'shrimp', 'prawn', 'prawns', 'crab', 'lobster',
      'cod', 'tilapia', 'sardine', 'anchovy', 'mussel', 'oyster', 'squid',
      'seafood',
    ],
  },
  {
    category: 'Grains',
    words: [
      'rice', 'pasta', 'noodle', 'noodles', 'bread', 'flour', 'oats',
      'oatmeal', 'quinoa', 'couscous', 'barley', 'wheat', 'chickpea',
      'chickpeas', 'lentil', 'lentils', 'tortilla', 'tortillas', 'cereal',
      'granola', 'bulgur',
    ],
  },
  {
    category: 'Spices',
    words: [
      'salt', 'pepper', 'cumin', 'turmeric', 'paprika', 'cinnamon', 'nutmeg',
      'cardamom', 'clove', 'cloves', 'coriander', 'chili powder', 'curry',
      'oregano', 'bay leaf', 'saffron', 'mustard', 'vinegar', 'soy sauce',
      'hot sauce', 'ketchup', 'mayonnaise', 'mustard', 'honey', 'sugar',
      'olive oil', 'vegetable oil', 'coconut oil', 'sesame oil',
    ],
  },
  {
    category: 'Beverages',
    words: [
      'juice', 'water', 'soda', 'cola', 'coffee', 'tea', 'beer', 'wine',
      'smoothie', 'lemonade', 'milkshake', 'energy drink', 'orange juice',
      'apple juice', 'fruit juice',
    ],
  },
];

/**
 * Best-effort category for an ingredient name. The longest matching
 * keyword wins, so "chickpeas" maps to Grains (not "peas" → Vegetables)
 * and "eggplant" maps to Vegetables (not "egg" → Dairy). Falls back to
 * 'Other'. Used for scanned items and for shopping-list items derived
 * from recipe ingredients.
 */
export function categorizeIngredient(name: string): FridgeCategory {
  const lower = name.toLowerCase();
  let best: { category: FridgeCategory; length: number } | null = null;
  for (const { category, words } of CATEGORY_KEYWORDS) {
    for (const w of words) {
      if (lower.includes(w) && (!best || w.length > best.length)) {
        best = { category, length: w.length };
      }
    }
  }
  return best ? best.category : 'Other';
}
