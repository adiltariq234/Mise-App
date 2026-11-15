import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { TopNav, type ActiveTab } from './components/TopNav';
import { FilterSidebar } from './components/FilterSidebar';
import { FridgeScannerPanel } from './components/FridgeScannerPanel';
import { RecipeCard } from './components/RecipeCard';
import { CookingMode } from './components/CookingMode';
import { ShoppingListView } from './components/ShoppingListView';
import {
  INITIAL_FRIDGE_INGREDIENTS,
  INITIAL_RECIPES,
  SAMPLE_FRIDGE_IMAGE,
} from './data/seedData';
import type {
  DietaryRestriction,
  DifficultyLevel,
  FilterState,
  FridgeAnalysisResponse,
  IngredientItem,
  Recipe,
  ShoppingListItem,
} from './types/culinary';
import {
  createShoppingItemFromIngredient,
  filterAndSortRecipes,
  mergeShoppingListItem,
  normalizeIngredientName,
  recalculateRecipeAvailability,
} from './utils/recipeLogic';

const SHOPPING_STORAGE_KEY = 'mise_shopping_list_v1';

const DEFAULT_FILTERS: FilterState = {
  dietary: [],
  maxPrepTime: null,
  difficulty: 'All',
  searchQuery: '',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('recipes');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [previewImageUrl, setPreviewImageUrl] =
    useState<string>(SAMPLE_FRIDGE_IMAGE);
  const [summaryText, setSummaryText] = useState<string>(
    'Detected 13 fresh staples including eggs, baby spinach, cherry tomatoes, chicken breast, avocado, bell peppers, and cheddar. Upload your own fridge photo anytime.',
  );
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>(
    INITIAL_FRIDGE_INGREDIENTS,
  );
  const [rawRecipes, setRawRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => {
    try {
      const saved = localStorage.getItem(SHOPPING_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SHOPPING_STORAGE_KEY, JSON.stringify(shoppingList));
    } catch {
      // Ignore storage write errors
    }
  }, [shoppingList]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab, selectedRecipe?.id]);

  const syncedRecipes = useMemo(
    () => recalculateRecipeAvailability(rawRecipes, fridgeIngredients),
    [rawRecipes, fridgeIngredients],
  );

  const filteredRecipes = useMemo(
    () => filterAndSortRecipes(syncedRecipes, filters),
    [syncedRecipes, filters],
  );

  // Keep selectedRecipe synced with fridge ingredient edits
  const activeCookingRecipe = useMemo(() => {
    if (!selectedRecipe) return null;
    return (
      syncedRecipes.find((r) => r.id === selectedRecipe.id) || selectedRecipe
    );
  }, [selectedRecipe, syncedRecipes]);

  const activeShoppingCount = useMemo(
    () => shoppingList.filter((item) => !item.checked).length,
    [shoppingList],
  );

  const handleToggleDietary = (tag: DietaryRestriction) => {
    setFilters((prev) => {
      const exists = prev.dietary.includes(tag);
      return {
        ...prev,
        dietary: exists
          ? prev.dietary.filter((t) => t !== tag)
          : [...prev.dietary, tag],
      };
    });
  };

  const handleAddIngredient = (name: string) => {
    const normalized = normalizeIngredientName(name);
    setFridgeIngredients((prev) => {
      if (prev.some((i) => normalizeIngredientName(i) === normalized)) {
        return prev;
      }
      return [name, ...prev];
    });
  };

  const handleRemoveIngredient = (name: string) => {
    setFridgeIngredients((prev) => prev.filter((item) => item !== name));
  };

  const handleAddMissingToShoppingList = (
    ingredient: IngredientItem,
    recipeTitle: string,
  ) => {
    const newItem = createShoppingItemFromIngredient(ingredient, recipeTitle);
    setShoppingList((prev) => mergeShoppingListItem(prev, newItem));
  };

  const handleAddManualShoppingItem = (name: string, amount: string) => {
    const newItem: ShoppingListItem = {
      id: `${normalizeIngredientName(name)}-${Date.now()}`,
      name,
      amount,
      checked: false,
      addedAt: Date.now(),
    };
    setShoppingList((prev) => mergeShoppingListItem(prev, newItem));
  };

  const handleToggleShoppingItem = (id: string) => {
    setShoppingList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const handleDeleteShoppingItem = (id: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCheckedShoppingItems = () => {
    setShoppingList((prev) => prev.filter((item) => !item.checked));
  };

  const analyzeImageDataUrl = async (dataUrl: string, mimeType: string) => {
    setPreviewImageUrl(dataUrl);
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze-fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType,
          dietaryRestrictions: filters.dietary,
        }),
      });

      const payload = (await response.json()) as Partial<FridgeAnalysisResponse> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Could not analyze fridge photo.');
      }

      if (
        Array.isArray(payload.detectedIngredients) &&
        payload.detectedIngredients.length > 0
      ) {
        setFridgeIngredients(payload.detectedIngredients);
      }
      if (payload.summary) {
        setSummaryText(payload.summary);
      }
      if (Array.isArray(payload.recipes) && payload.recipes.length > 0) {
        setRawRecipes(payload.recipes);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to reach AI fridge analyzer right now.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        analyzeImageDataUrl(reader.result, file.type || 'image/jpeg');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRefreshRecipesWithAI = async () => {
    if (fridgeIngredients.length === 0) return;
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/suggest-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: fridgeIngredients,
          dietaryRestrictions: filters.dietary,
        }),
      });
      const payload = (await response.json()) as Partial<FridgeAnalysisResponse> & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || 'Could not refresh recipe ideas.');
      }
      if (payload.summary) {
        setSummaryText(payload.summary);
      }
      if (Array.isArray(payload.recipes) && payload.recipes.length > 0) {
        setRawRecipes(payload.recipes);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to generate recipes right now.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTriggerScanFromNav = () => {
    setSelectedRecipe(null);
    setActiveTab('recipes');
    requestAnimationFrame(() => {
      fileInputRef.current?.click();
    });
  };

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setSelectedRecipe(null);
          setActiveTab(tab);
        }}
        shoppingCount={activeShoppingCount}
        onTriggerScan={handleTriggerScanFromNav}
      />

      {activeCookingRecipe ? (
        <main>
          <CookingMode
            recipe={activeCookingRecipe}
            shoppingList={shoppingList}
            onAddMissingToShoppingList={handleAddMissingToShoppingList}
            onExit={() => setSelectedRecipe(null)}
          />
        </main>
      ) : activeTab === 'shopping' ? (
        <main>
          <ShoppingListView
            items={shoppingList}
            onAddItem={handleAddManualShoppingItem}
            onToggleItem={handleToggleShoppingItem}
            onDeleteItem={handleDeleteShoppingItem}
            onClearChecked={handleClearCheckedShoppingItems}
            onBrowseRecipes={() => setActiveTab('recipes')}
          />
        </main>
      ) : (
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            {/* Mobile Filter Toggle */}
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                <span>
                  {mobileFiltersOpen
                    ? 'Hide Filters & Ingredients'
                    : 'Dietary Filters & Fridge'}
                  {filters.dietary.length > 0
                    ? ` (${filters.dietary.length})`
                    : ''}
                </span>
              </button>
            </div>

            {/* Sidebar: Always visible on lg+, toggleable on mobile */}
            <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
              <FilterSidebar
                filters={filters}
                onToggleDietary={handleToggleDietary}
                onSetMaxPrepTime={(minutes) =>
                  setFilters((prev) => ({ ...prev, maxPrepTime: minutes }))
                }
                onSetDifficulty={(difficulty: DifficultyLevel | 'All') =>
                  setFilters((prev) => ({ ...prev, difficulty }))
                }
                onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                fridgeIngredients={fridgeIngredients}
                onAddIngredient={handleAddIngredient}
                onRemoveIngredient={handleRemoveIngredient}
                onRefreshWithAI={handleRefreshRecipesWithAI}
                isRefreshingAI={isAnalyzing}
              />
            </div>

            {/* Main Content: Fridge Scanner + Scrollable Recipe Cards */}
            <div className="min-w-0 flex-1 space-y-6">
              <FridgeScannerPanel
                previewImageUrl={previewImageUrl}
                summaryText={summaryText}
                isAnalyzing={isAnalyzing}
                errorMessage={errorMessage}
                onDismissError={() => setErrorMessage(null)}
                onAnalyzeFile={handleAnalyzeFile}
                onAnalyzeDataUrl={analyzeImageDataUrl}
                fileInputRef={fileInputRef}
              />

              {/* Recipe Feed Header + Search */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-slate-900">
                    Suggested Recipes
                  </h2>
                  <p className="text-sm text-slate-600 tabular-nums">
                    Showing {filteredRecipes.length} of {syncedRecipes.length}{' '}
                    recipes
                    {filters.dietary.length > 0
                      ? ` · ${filters.dietary.join(', ')}`
                      : ''}
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <label htmlFor="recipe-search" className="sr-only">
                    Search recipes or ingredients
                  </label>
                  <input
                    id="recipe-search"
                    type="search"
                    value={filters.searchQuery}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        searchQuery: e.target.value,
                      }))
                    }
                    placeholder="Search dishes or ingredients..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
                  />
                  {filters.searchQuery ? (
                    <button
                      type="button"
                      aria-label="Clear recipe search"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, searchQuery: '' }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Loading Skeletons or Scrollable Recipe Grid */}
              {isAnalyzing ? (
                <div
                  aria-label="Loading recipe suggestions"
                  className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
                >
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white animate-pulse"
                    >
                      <div className="aspect-[4/3] w-full bg-slate-200" />
                      <div className="space-y-3 p-5">
                        <div className="h-3 w-2/3 rounded bg-slate-200" />
                        <div className="h-6 w-4/5 rounded bg-slate-200" />
                        <div className="h-4 w-full rounded bg-slate-100" />
                        <div className="h-10 w-full rounded-lg bg-slate-200 mt-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <h3 className="font-display text-xl font-semibold text-slate-900">
                    No recipes match those filters
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
                    Try relaxing a dietary restriction or time limit, or ask AI to generate fresh recipes for your current ingredients.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Reset Filters
                    </button>
                    <button
                      type="button"
                      onClick={handleRefreshRecipesWithAI}
                      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      Generate Matching Recipes
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  data-testid="recipe-grid"
                  className="grid grid-cols-1 gap-6 md:grid-cols-2"
                >
                  {filteredRecipes.map((recipe, idx) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      index={idx}
                      shoppingList={shoppingList}
                      onAddMissingToShoppingList={handleAddMissingToShoppingList}
                      onSelectRecipe={(r) => setSelectedRecipe(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
