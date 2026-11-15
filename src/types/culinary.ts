export type DietaryRestriction =
  | 'Vegetarian'
  | 'Vegan'
  | 'Keto'
  | 'Gluten-Free'
  | 'Dairy-Free'
  | 'High-Protein';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface IngredientItem {
  name: string;
  amount: string;
  essential: boolean;
  inFridge: boolean;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  tip?: string;
  durationMinutes?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  calories: number;
  servings: number;
  dietaryTags: DietaryRestriction[];
  imageUrl?: string;
  ingredients: IngredientItem[];
  steps: RecipeStep[];
}

export interface ShoppingListItem {
  id: string;
  name: string;
  amount: string;
  sourceRecipe?: string;
  checked: boolean;
  addedAt: number;
}

export interface FilterState {
  dietary: DietaryRestriction[];
  maxPrepTime: number | null;
  difficulty: DifficultyLevel | 'All';
  searchQuery: string;
}

export interface FridgeAnalysisResponse {
  detectedIngredients: string[];
  summary: string;
  recipes: Recipe[];
}
