import type { Recipe } from '../types/culinary';
import sampleFridgeImg from '../assets/images/fridge_sample_fresh_1794677773403.jpg';
import dishHerbOmeletteImg from '../assets/images/dish_herb_omelette_1794677773815.jpg';
import dishKetoSkilletImg from '../assets/images/dish_keto_skillet_1794677775631.jpg';
import dishMediterraneanBowlImg from '../assets/images/dish_mediterranean_bowl_1794677774517.jpg';
import dishLemonSalmonImg from '../assets/images/dish_lemon_salmon_1794677771509.jpg';

export const SAMPLE_FRIDGE_IMAGE = sampleFridgeImg;

// NOTE: AI-generated recipes intentionally have NO fallback photo — showing
// a stock image of a different dish was misleading (QA P0-4). Seed recipes
// carry their own real imageUrl; AI recipes render a clean text-only card.

export const INITIAL_FRIDGE_INGREDIENTS: string[] = [
  'Eggs',
  'Organic Baby Spinach',
  'Cherry Tomatoes',
  'Avocado',
  'Bell Peppers',
  'Zucchini',
  'Cheddar Cheese',
  'Chicken Breast',
  'Fresh Basil',
  'Lemons',
  'Greek Yogurt',
  'Milk',
  'Carrots',
];

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'herb-spinach-omelette',
    title: 'Herb & Spinach Feta Omelette',
    description:
      'Tender golden three-egg omelette folded around wilted baby spinach, fresh basil, and crumbled feta with sliced avocado.',
    difficulty: 'Easy',
    prepTimeMinutes: 5,
    cookTimeMinutes: 8,
    calories: 410,
    servings: 1,
    dietaryTags: ['Vegetarian', 'Keto', 'Gluten-Free', 'High-Protein'],
    imageUrl: dishHerbOmeletteImg,
    ingredients: [
      { name: 'Eggs', amount: '3 large', essential: true, inFridge: true },
      { name: 'Organic Baby Spinach', amount: '1 cup', essential: true, inFridge: true },
      { name: 'Avocado', amount: '1/2 sliced', essential: false, inFridge: true },
      { name: 'Fresh Basil', amount: '1 tbsp chopped', essential: false, inFridge: true },
      { name: 'Feta Cheese', amount: '40 g crumbled', essential: true, inFridge: false },
      { name: 'Olive Oil', amount: '1 tbsp', essential: false, inFridge: false },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction:
          'Crack 3 eggs into a bowl with a pinch of sea salt and freshly cracked black pepper, then whisk until uniform and slightly frothy.',
        tip: 'Resting the whisked eggs for 2 minutes lets the salt tenderize the proteins.',
      },
      {
        stepNumber: 2,
        instruction:
          'Warm olive oil in an 8-inch nonstick skillet over medium-low heat. Add the baby spinach and sauté until just wilted.',
        durationMinutes: 2,
      },
      {
        stepNumber: 3,
        instruction:
          'Pour in the whisked eggs and gently pull the edges toward the center with a silicone spatula for 3 minutes until the base sets while the top stays glossy.',
        durationMinutes: 3,
      },
      {
        stepNumber: 4,
        instruction:
          'Scatter crumbled feta cheese and chopped basil across one half of the omelette, fold cleanly in half, and slide onto a warm plate beside sliced avocado.',
      },
    ],
  },
  {
    id: 'garlic-herb-chicken-skillet',
    title: 'Garlic Herb Chicken & Zucchini Skillet',
    description:
      'Golden pan-seared chicken with caramelized zucchini rounds, sweet bell peppers, and bright lemon-herb pan juices.',
    difficulty: 'Easy',
    prepTimeMinutes: 10,
    cookTimeMinutes: 18,
    calories: 465,
    servings: 2,
    dietaryTags: ['Keto', 'Gluten-Free', 'Dairy-Free', 'High-Protein'],
    imageUrl: dishKetoSkilletImg,
    ingredients: [
      { name: 'Chicken Breast', amount: '450 g', essential: true, inFridge: true },
      { name: 'Zucchini', amount: '2 medium', essential: true, inFridge: true },
      { name: 'Bell Peppers', amount: '2 sliced', essential: true, inFridge: true },
      { name: 'Lemons', amount: '1 whole', essential: false, inFridge: true },
      { name: 'Fresh Thyme', amount: '4 sprigs', essential: true, inFridge: false },
      { name: 'Garlic', amount: '3 cloves smashed', essential: true, inFridge: false },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction:
          'Pat the chicken dry, season generously with salt and pepper, and slice the zucchini and bell peppers into even bite-size pieces.',
      },
      {
        stepNumber: 2,
        instruction:
          'Sear the chicken in a hot cast-iron skillet until deeply golden on the first side, about 6 minutes, before flipping.',
        durationMinutes: 6,
      },
      {
        stepNumber: 3,
        instruction:
          'Push chicken to the edges, add smashed garlic, fresh thyme, zucchini, and bell peppers, and sauté until crisp-tender and caramelized.',
        durationMinutes: 7,
      },
      {
        stepNumber: 4,
        instruction:
          'Squeeze fresh lemon juice directly into the hot skillet to deglaze the browned bits and spoon the herb juices over the chicken.',
      },
    ],
  },
  {
    id: 'mediterranean-harvest-bowl',
    title: 'Mediterranean Chickpea & Greens Bowl',
    description:
      'Spiced roasted chickpeas over crisp baby spinach, blistered cherry tomatoes, olives, and creamy lemon-tahini dressing.',
    difficulty: 'Medium',
    prepTimeMinutes: 12,
    cookTimeMinutes: 20,
    calories: 495,
    servings: 2,
    dietaryTags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free'],
    imageUrl: dishMediterraneanBowlImg,
    ingredients: [
      { name: 'Organic Baby Spinach', amount: '3 cups', essential: true, inFridge: true },
      { name: 'Cherry Tomatoes', amount: '1.5 cups halved', essential: true, inFridge: true },
      { name: 'Lemons', amount: '1 juiced', essential: true, inFridge: true },
      { name: 'Chickpeas', amount: '1 can drained', essential: true, inFridge: false },
      { name: 'Tahini', amount: '3 tbsp', essential: true, inFridge: false },
      { name: 'Cucumber', amount: '1/2 ribboned', essential: false, inFridge: false },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction:
          'Pat drained chickpeas dry with a clean towel, toss with olive oil, cumin, smoked paprika, and salt, and roast at 425°F (220°C) until crisp.',
        durationMinutes: 20,
        tip: 'Drying the chickpeas thoroughly is the secret to a crunchy exterior.',
      },
      {
        stepNumber: 2,
        instruction:
          'Whisk tahini with fresh lemon juice, 2 tablespoons warm water, and a pinch of salt until smooth and pourable.',
      },
      {
        stepNumber: 3,
        instruction:
          'Arrange baby spinach, halved cherry tomatoes, cucumber ribbons, and warm spiced chickpeas in wide bowls, then drizzle generously with lemon tahini.',
      },
    ],
  },
  {
    id: 'seared-lemon-dill-salmon',
    title: 'Pan-Seared Lemon Salmon & Asparagus',
    description:
      'Crisp-skin salmon fillet paired with charred lemon, blistered cherry tomatoes, and tender green asparagus.',
    difficulty: 'Medium',
    prepTimeMinutes: 8,
    cookTimeMinutes: 12,
    calories: 520,
    servings: 2,
    dietaryTags: ['Keto', 'Gluten-Free', 'Dairy-Free', 'High-Protein'],
    imageUrl: dishLemonSalmonImg,
    ingredients: [
      { name: 'Cherry Tomatoes', amount: '1 cup on vine', essential: true, inFridge: true },
      { name: 'Lemons', amount: '1 halved', essential: true, inFridge: true },
      { name: 'Salmon Fillet', amount: '2 fillets', essential: true, inFridge: false },
      { name: 'Asparagus', amount: '1 bunch trimmed', essential: true, inFridge: false },
      { name: 'Fresh Dill', amount: '2 tbsp', essential: false, inFridge: false },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction:
          'Dry salmon fillets thoroughly with paper towels and season all over with flaky salt and black pepper.',
      },
      {
        stepNumber: 2,
        instruction:
          'Place salmon skin-side down in a hot oiled skillet and press gently for 10 seconds so the skin stays flat. Sear undisturbed for 5 minutes.',
        durationMinutes: 5,
      },
      {
        stepNumber: 3,
        instruction:
          'Add trimmed asparagus, cherry tomatoes, and cut-side-down lemon halves to the pan. Flip salmon and cook 3 minutes more until just opaque inside.',
        durationMinutes: 3,
      },
      {
        stepNumber: 4,
        instruction:
          'Plate with fresh dill fronds and squeeze the warm caramelized lemon over the fish.',
      },
    ],
  },
];
