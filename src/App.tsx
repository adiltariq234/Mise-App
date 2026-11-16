import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Search, SlidersHorizontal, Undo2, X } from 'lucide-react';
import { TopNav, type ActiveTab } from './components/TopNav';
import { FilterSidebar, type ScanHistoryEntry } from './components/FilterSidebar';
import { FridgeScannerPanel, type ScanStage } from './components/FridgeScannerPanel';
import { RecipeCard } from './components/RecipeCard';
import { CookingMode } from './components/CookingMode';
import { ShoppingListView } from './components/ShoppingListView';
import { MealPlanner } from './components/MealPlanner';
import { SharePanel } from './components/SharePanel';
import { LegalPages, type LegalView } from './components/LegalPages';
import {
  INITIAL_FRIDGE_INGREDIENTS,
  INITIAL_RECIPES,
  SAMPLE_FRIDGE_IMAGE,
} from './data/seedData';
import type {
  DietaryRestriction,
  DifficultyLevel,
  FilterState,
  FridgeCategory,
  FridgeIngredient,
  FridgeAnalysisResponse,
  FridgeProfile,
  IngredientItem,
  MealPlan,
  Recipe,
  ScanRecord,
  ShoppingListItem,
  WeekDay,
} from './types/culinary';
import {
  createShoppingItemFromIngredient,
  filterAndSortRecipes,
  mergeShoppingListItem,
  normalizeIngredientName,
  recalculateRecipeAvailability,
} from './utils/recipeLogic';
import {
  addFridgeIngredient,
  fridgeIngredientNames,
  fromScanNames,
  makeFridgeIngredient,
  removeFridgeIngredient,
  updateFridgeIngredient,
} from './utils/fridge';
import {
  addFridgeProfile,
  deleteFridgeProfile,
  initialFridgeProfiles,
  makeFridgeProfile,
  renameFridgeProfile,
  updateProfileIngredients,
} from './utils/fridges.ts';
import { loadStored, saveStored, removeStored, STORAGE_KEYS, STORAGE_VERSIONS } from './utils/storage';
import { prepareImageDataUrl, prepareImageFile, makeThumbnail } from './utils/imagePrep';
import { fetchWithTimeout, friendlyApiError, parseApiPayload, ApiTimeoutError } from './utils/errors';
import { clearMeal, planMissingIngredients, setMeal } from './utils/mealPlan.ts';
import { decodeShare, type SharePayload } from './utils/sharing.ts';
import { getStrings, fmt, isLanguage, type Language } from './utils/i18n.ts';
import { WEEK_DAYS } from './types/culinary.ts';

const DEFAULT_FILTERS: FilterState = {
  dietary: [],
  maxPrepTime: null,
  difficulty: 'All',
  searchQuery: '',
};

const DEMO_SUMMARY =
  'This is a sample fridge — upload a photo of your own fridge and Mise will detect what is inside and suggest recipes you can cook tonight.';

const MAX_SCAN_HISTORY = 5;
const SYNC_TIMEOUT_MS = 150_000;
const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_ATTEMPTS = 45;

function initialProfiles(): FridgeProfile[] {
  return initialFridgeProfiles(fromScanNames(INITIAL_FRIDGE_INGREDIENTS));
}

function initialLastScan(): ScanRecord | null {
  return loadStored<ScanRecord>(STORAGE_KEYS.lastScan, STORAGE_VERSIONS.lastScan);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('recipes');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [legalView, setLegalView] = useState<LegalView>(null);

  const lastScan = useRef<ScanRecord | null>(initialLastScan());

  const [previewImageUrl, setPreviewImageUrl] = useState<string>(
    lastScan.current?.thumbnail || SAMPLE_FRIDGE_IMAGE,
  );
  const [summaryText, setSummaryText] = useState<string>(
    lastScan.current?.summary || DEMO_SUMMARY,
  );
  const [isDemo, setIsDemo] = useState<boolean>(!lastScan.current);
  const [fridgeProfiles, setFridgeProfiles] =
    useState<FridgeProfile[]>(initialProfiles);
  const [activeFridgeId, setActiveFridgeId] = useState<string>(() =>
    loadStored<string>(STORAGE_KEYS.activeFridge, STORAGE_VERSIONS.activeFridge) || '',
  );
  // The active profile (falls back to the first when the saved id is gone)
  // and its ingredients — most of the app reads `fridgeIngredients` and
  // does not need to know about profiles.
  const activeProfile =
    fridgeProfiles.find((p) => p.id === activeFridgeId) || fridgeProfiles[0];
  const activeFridgeIdResolved = activeProfile?.id || '';
  const fridgeIngredients: FridgeIngredient[] = activeProfile?.ingredients || [];
  const [rawRecipes, setRawRecipes] = useState<Recipe[]>(
    lastScan.current?.recipes?.length ? lastScan.current.recipes : INITIAL_RECIPES,
  );
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStage, setScanStage] = useState<ScanStage>('idle');
  const [scanElapsedSeconds, setScanElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previousRecipes, setPreviousRecipes] = useState<Recipe[] | null>(null);
  const [previousSummary, setPreviousSummary] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<string[]>(() =>
    loadStored<string[]>(STORAGE_KEYS.favorites, STORAGE_VERSIONS.favorites) || [],
  );
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>(() =>
    loadStored<ScanRecord[]>(STORAGE_KEYS.scanHistory, STORAGE_VERSIONS.scanHistory) || [],
  );

  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() =>
    loadStored<ShoppingListItem[]>(STORAGE_KEYS.shoppingList, STORAGE_VERSIONS.shoppingList) || [],
  );

  // Language (English / Urdu) — persisted; `s` is the UI strings object
  // passed down to components.
  const [lang, setLang] = useState<Language>(() => {
    const saved = loadStored<Language>(STORAGE_KEYS.language, STORAGE_VERSIONS.language);
    return isLanguage(saved) ? saved : 'en';
  });
  const s = getStrings(lang);

  // Weekly meal plan — persisted in localStorage.
  const [mealPlan, setMealPlan] = useState<MealPlan>(() =>
    loadStored<MealPlan>(STORAGE_KEYS.mealPlan, STORAGE_VERSIONS.mealPlan) || {},
  );

  // Family sharing (local-only): a `#share=<code>` link decoded on load,
  // plus the last import status shown in the share panel.
  const [pendingShare, setPendingShare] = useState<SharePayload | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (!hash.startsWith('#share=')) return;
      const decoded = decodeShare(hash.slice('#share='.length));
      if (decoded.ok) {
        setPendingShare(decoded.payload);
      } else {
        setShareStatus(decoded.error);
      }
    } catch {
      // Ignore (non-browser runtimes)
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inFlightRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);

  // Latest state for async callbacks (polling / fetch continuations) so
  // they never act on a stale render's closure.
  const stateRef = useRef({ fridgeProfiles, activeFridgeIdResolved, rawRecipes, summaryText });
  useEffect(() => {
    stateRef.current = { fridgeProfiles, activeFridgeIdResolved, rawRecipes, summaryText };
  });

  // Persist fridges, favorites, history, shopping list (safe wrappers).
  useEffect(() => {
    saveStored(STORAGE_KEYS.fridges, STORAGE_VERSIONS.fridges, fridgeProfiles);
  }, [fridgeProfiles]);
  useEffect(() => {
    saveStored(STORAGE_KEYS.activeFridge, STORAGE_VERSIONS.activeFridge, activeFridgeIdResolved);
  }, [activeFridgeIdResolved]);
  useEffect(() => {
    saveStored(STORAGE_KEYS.favorites, STORAGE_VERSIONS.favorites, favorites);
  }, [favorites]);
  useEffect(() => {
    saveStored(STORAGE_KEYS.scanHistory, STORAGE_VERSIONS.scanHistory, scanHistory);
  }, [scanHistory]);
  useEffect(() => {
    saveStored(STORAGE_KEYS.shoppingList, STORAGE_VERSIONS.shoppingList, shoppingList);
  }, [shoppingList]);
  useEffect(() => {
    saveStored(STORAGE_KEYS.mealPlan, STORAGE_VERSIONS.mealPlan, mealPlan);
  }, [mealPlan]);
  useEffect(() => {
    saveStored(STORAGE_KEYS.language, STORAGE_VERSIONS.language, lang);
    try {
      document.documentElement.lang = lang;
    } catch {
      // Ignore (non-browser runtimes)
    }
  }, [lang]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab, selectedRecipe?.id]);

  // Elapsed-time ticker while a scan/refresh is running.
  useEffect(() => {
    if (!isAnalyzing) return;
    const id = window.setInterval(() => {
      setScanElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isAnalyzing]);

  // Advance the displayed stage by elapsed time for synchronous calls.
  useEffect(() => {
    if (!isAnalyzing || scanStage === 'polling') return;
    if (scanElapsedSeconds < 3) setScanStage('preparing');
    else if (scanElapsedSeconds < 8) setScanStage('uploading');
    else if (scanElapsedSeconds < 45) setScanStage('analyzing');
    else setScanStage('generating');
  }, [scanElapsedSeconds, isAnalyzing, scanStage]);

  // Cancel any in-flight polling on unmount.
  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  const syncedRecipes = useMemo(
    () => recalculateRecipeAvailability(rawRecipes, fridgeIngredients),
    [rawRecipes, fridgeIngredients],
  );

  const filteredRecipes = useMemo(() => {
    const base = filterAndSortRecipes(syncedRecipes, filters);
    return favoritesOnly ? base.filter((r) => favorites.includes(r.id)) : base;
  }, [syncedRecipes, filters, favoritesOnly, favorites]);

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

  const favoriteCount = favorites.length;

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

  /** Apply a pure ingredient-list change to the active fridge profile. */
  const updateActiveIngredients = (
    fn: (items: FridgeIngredient[]) => FridgeIngredient[],
  ) => {
    const id = activeFridgeIdResolved;
    if (!id) return;
    setFridgeProfiles((prev) =>
      updateProfileIngredients(prev, id, fn(fridgeIngredients)),
    );
  };

  const handleAddIngredient = (name: string, quantity?: string, category?: FridgeCategory) => {
    updateActiveIngredients((prev) => addFridgeIngredient(prev, name, { quantity, category }));
  };

  const handleUpdateIngredient = (
    id: string,
    patch: Partial<Pick<FridgeIngredient, 'name' | 'quantity' | 'category' | 'expiresAt'>>,
  ) => {
    updateActiveIngredients((prev) => updateFridgeIngredient(prev, id, patch));
  };

  const handleRemoveIngredient = (id: string) => {
    updateActiveIngredients((prev) => removeFridgeIngredient(prev, id));
  };

  // --- Fridge profiles --------------------------------------------------
  const handleAddFridge = (name: string) => {
    if (!name.trim()) return;
    const profile = makeFridgeProfile(name, []);
    setFridgeProfiles((prev) => [...prev, profile]);
    setActiveFridgeId(profile.id);
  };

  const handleRenameFridge = (id: string, name: string) => {
    setFridgeProfiles((prev) => renameFridgeProfile(prev, id, name));
  };

  const handleDeleteFridge = (id: string) => {
    const next = deleteFridgeProfile(fridgeProfiles, id);
    if (next.length === fridgeProfiles.length) return; // last one: no-op
    setFridgeProfiles(next);
    if (id === activeFridgeIdResolved) setActiveFridgeId(next[0].id);
  };

  const handleSelectFridge = (id: string) => {
    setActiveFridgeId(id);
  };

  const handleAddMissingToShoppingList = (
    ingredient: IngredientItem,
    recipeTitle: string,
  ) => {
    const newItem = createShoppingItemFromIngredient(ingredient, recipeTitle);
    setShoppingList((prev) => mergeShoppingListItem(prev, newItem));
  };

  const handleAddManualShoppingItem = (name: string, amount: string, category?: FridgeCategory) => {
    const newItem: ShoppingListItem = {
      id: `${normalizeIngredientName(name)}-${Date.now()}`,
      name,
      amount,
      category,
      checked: false,
      addedAt: Date.now(),
    };
    setShoppingList((prev) => mergeShoppingListItem(prev, newItem));
  };

  const handleUpdateShoppingItem = (
    id: string,
    patch: Partial<Pick<ShoppingListItem, 'name' | 'amount' | 'category'>>,
  ) => {
    setShoppingList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              name: patch.name !== undefined ? patch.name.trim() || item.name : item.name,
              amount: patch.amount !== undefined ? patch.amount.trim() || item.amount : item.amount,
              category: patch.category !== undefined ? patch.category : item.category,
            }
          : item,
      ),
    );
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

  const handleToggleFavorite = (recipe: Recipe) => {
    setFavorites((prev) =>
      prev.includes(recipe.id)
        ? prev.filter((id) => id !== recipe.id)
        : [...prev, recipe.id],
    );
  };

  // --- Weekly meal plan -------------------------------------------------
  const handleSetMeal = (day: WeekDay, recipeId: string, servings: number) => {
    setMealPlan((prev) => setMeal(prev, day, recipeId, servings));
  };

  const handleClearMeal = (day: WeekDay) => {
    setMealPlan((prev) => clearMeal(prev, day));
  };

  const handleClearPlan = () => {
    setMealPlan({});
  };

  /** Add the planned meals' missing essentials to the shopping list. */
  const handleAddPlanToShoppingList = () => {
    const missing = planMissingIngredients(
      mealPlan,
      syncedRecipes,
      fridgeIngredientNames(fridgeIngredients),
    );
    if (missing.length === 0) return;
    setShoppingList((prev) => {
      let next = prev;
      for (const { ingredient, recipeTitle } of missing) {
        next = mergeShoppingListItem(
          next,
          createShoppingItemFromIngredient(ingredient, recipeTitle),
        );
      }
      return next;
    });
  };

  // --- Family sharing (local-only import) -------------------------------
  const clearShareHash = () => {
    try {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      );
    } catch {
      // Ignore (non-browser runtimes)
    }
  };

  /**
   * Import a decoded share payload: the shared fridge becomes a new
   * profile (fresh ids, so nothing collides), shopping items merge by
   * name, and the meal plan fills only days that are still empty.
   * Returns a short summary for the share panel.
   */
  const handleImportShare = (payload: SharePayload): string => {
    const parts: string[] = [];
    if (payload.fridge) {
      const imported = payload.fridge.ingredients.map((i) =>
        makeFridgeIngredient(i.name, i.source, {
          quantity: i.quantity,
          category: i.category,
          expiresAt: i.expiresAt ?? null,
        }),
      );
      const profile = makeFridgeProfile(
        `${payload.fridge.name} (shared)`,
        imported,
      );
      setFridgeProfiles((prev) => [...prev, profile]);
      setActiveFridgeId(profile.id);
      parts.push(`fridge "${payload.fridge.name}" (${imported.length} items)`);
    }
    if (payload.shoppingList && payload.shoppingList.length > 0) {
      const items = payload.shoppingList;
      setShoppingList((prev) => {
        let next = prev;
        for (const item of items) {
          next = mergeShoppingListItem(next, {
            ...item,
            id: `${normalizeIngredientName(item.name)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          });
        }
        return next;
      });
      parts.push(`${items.length} shopping items`);
    }
    if (payload.mealPlan) {
      const fillCount = WEEK_DAYS.filter(
        (day) => !mealPlan[day] && payload.mealPlan?.[day],
      ).length;
      if (fillCount > 0) {
        const incoming = payload.mealPlan;
        setMealPlan((prev) => {
          const next: MealPlan = { ...prev };
          for (const day of WEEK_DAYS) {
            if (!next[day] && incoming[day]) next[day] = incoming[day];
          }
          return next;
        });
        parts.push(`${fillCount} planned meals`);
      }
    }
    clearShareHash();
    const summary =
      parts.length > 0
        ? `Imported ${parts.join(', ')}.`
        : 'Nothing to import — the share was empty.';
    setShareStatus(summary);
    return summary;
  };

  /** Apply a successful scan: keep manual fridge items, replace scanned
   * ones, persist the scan + history, and remember the previous recipes
   * so an AI refresh can be undone. Scans always land in the active
   * fridge profile. */
  const applyScanResult = (
    payload: FridgeAnalysisResponse,
    thumbnail: string | null,
    opts: { isRefresh?: boolean } = {},
  ) => {
    const scanned = fromScanNames(payload.detectedIngredients || []);
    const ref = stateRef.current;
    const active =
      ref.fridgeProfiles.find((p) => p.id === ref.activeFridgeIdResolved) ||
      ref.fridgeProfiles[0];
    const manual = active
      ? active.ingredients.filter((i) => i.source === 'manual')
      : [];
    const nextFridge = [...manual, ...scanned];
    if (scanned.length > 0 && active) {
      setFridgeProfiles((prev) =>
        updateProfileIngredients(prev, active.id, nextFridge),
      );
    }
    setSummaryText(payload.summary || 'Ingredients identified from your fridge photo.');
    if (Array.isArray(payload.recipes) && payload.recipes.length > 0) {
      setPreviousRecipes(stateRef.current.rawRecipes);
      setPreviousSummary(stateRef.current.summaryText);
      setRawRecipes(payload.recipes);
    }
    setIsDemo(false);

    const record: ScanRecord = {
      id: `scan-${Date.now()}`,
      scannedAt: Date.now(),
      summary: payload.summary || '',
      ingredients: nextFridge,
      recipes: Array.isArray(payload.recipes) ? payload.recipes : [],
      thumbnail,
    };
    lastScan.current = record;
    saveStored(STORAGE_KEYS.lastScan, STORAGE_VERSIONS.lastScan, record);
    setScanHistory((prev) => {
      const withoutThumbnail = { ...record, thumbnail: null };
      const next = [withoutThumbnail, ...prev.filter((r) => r.id !== record.id)].slice(
        0,
        MAX_SCAN_HISTORY,
      );
      return next;
    });
    if (opts.isRefresh) {
      // A refresh keeps the same preview; nothing else to do.
    }
  };

  const finishAnalysis = () => {
    setIsAnalyzing(false);
    setScanStage('idle');
    inFlightRef.current = false;
  };

  const failAnalysis = (message: string) => {
    setErrorMessage(message);
    finishAnalysis();
  };

  /** Poll a 202 async job until it completes, fails, or times out. */
  const pollJob = async (jobId: string, thumbnail: string | null) => {
    setScanStage('polling');
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((resolve) => {
        pollTimerRef.current = window.setTimeout(resolve, POLL_INTERVAL_MS);
      });
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const { payload } = await parseApiPayload<{
          status?: string;
          result?: FridgeAnalysisResponse;
          error?: string;
          code?: string;
        }>(response);
        if (payload.status === 'complete' && payload.result) {
          applyScanResult(payload.result, thumbnail);
          finishAnalysis();
          return;
        }
        if (payload.status === 'failed') {
          failAnalysis(
            friendlyApiError(response.status, payload.code, payload.error || 'The AI could not finish this scan. Please try again.'),
          );
          return;
        }
      } catch {
        // A single failed poll is not fatal — keep polling.
      }
    }
    failAnalysis('The AI took too long to respond. Please try again — your photo was not lost.');
  };

  const runAiRequest = async (
    endpoint: '/api/analyze-fridge' | '/api/suggest-recipes',
    body: Record<string, unknown>,
    thumbnail: string | null,
  ) => {
    if (inFlightRef.current) return; // Prevent duplicate submissions.
    inFlightRef.current = true;
    setIsAnalyzing(true);
    setScanStage('preparing');
    setScanElapsedSeconds(0);
    setErrorMessage(null);

    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        SYNC_TIMEOUT_MS,
      );
      const { payload } = await parseApiPayload<FridgeAnalysisResponse & { jobId?: string; status?: string }>(response);

      if (response.status === 202 && payload.jobId) {
        await pollJob(payload.jobId, thumbnail);
        return;
      }
      if (!response.ok) {
        throw new Error(
          friendlyApiError(
            response.status,
            payload.code,
            payload.error || 'Could not analyze fridge photo.',
          ),
        );
      }
      applyScanResult(payload as FridgeAnalysisResponse, thumbnail, {
        isRefresh: endpoint === '/api/suggest-recipes',
      });
      finishAnalysis();
    } catch (err) {
      if (err instanceof ApiTimeoutError) {
        failAnalysis('The AI took too long to respond. Please try again — your photo was not lost.');
      } else if (err instanceof Error) {
        failAnalysis(err.message);
      } else {
        failAnalysis('Unable to reach the AI service right now. Please try again.');
      }
    }
  };

  const analyzeImageDataUrl = async (dataUrl: string, mimeType: string) => {
    // Compress/re-encode before upload (camera captures and re-scans).
    const prepared = await prepareImageDataUrl(dataUrl);
    if (!prepared.ok) {
      setErrorMessage(prepared.error);
      return;
    }
    setPreviewImageUrl(prepared.dataUrl);
    const thumbnail = await makeThumbnail(prepared.dataUrl);
    await runAiRequest(
      '/api/analyze-fridge',
      {
        imageBase64: prepared.dataUrl,
        mimeType: prepared.mimeType,
        dietaryRestrictions: filters.dietary,
      },
      thumbnail,
    );
  };

  const handleAnalyzeFile = async (file: File) => {
    const prepared = await prepareImageFile(file);
    if (!prepared.ok) {
      setErrorMessage(prepared.error);
      return;
    }
    setPreviewImageUrl(prepared.dataUrl);
    const thumbnail = await makeThumbnail(prepared.dataUrl);
    await runAiRequest(
      '/api/analyze-fridge',
      {
        imageBase64: prepared.dataUrl,
        mimeType: prepared.mimeType,
        dietaryRestrictions: filters.dietary,
      },
      thumbnail,
    );
  };

  const handleRefreshRecipesWithAI = async () => {
    if (fridgeIngredients.length === 0) return;
    await runAiRequest(
      '/api/suggest-recipes',
      {
        ingredients: fridgeIngredientNames(fridgeIngredients),
        dietaryRestrictions: filters.dietary,
      },
      lastScan.current?.thumbnail || null,
    );
  };

  const handleUndoRefresh = () => {
    if (!previousRecipes) return;
    setRawRecipes(previousRecipes);
    if (previousSummary) setSummaryText(previousSummary);
    setPreviousRecipes(null);
    setPreviousSummary(null);
  };

  const handleRestoreScan = (id: string) => {
    const record = scanHistory.find((r) => r.id === id);
    if (!record) return;
    // A restored scan lands in the active fridge profile.
    updateActiveIngredients(() => record.ingredients);
    setRawRecipes(record.recipes);
    setSummaryText(record.summary);
    setIsDemo(false);
    setPreviousRecipes(null);
    setPreviousSummary(null);
    if (record.thumbnail) setPreviewImageUrl(record.thumbnail);
    lastScan.current = record;
    saveStored(STORAGE_KEYS.lastScan, STORAGE_VERSIONS.lastScan, record);
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    removeStored(STORAGE_KEYS.scanHistory);
  };

  const handleClearScan = () => {
    updateActiveIngredients(() => fromScanNames(INITIAL_FRIDGE_INGREDIENTS));
    setRawRecipes(INITIAL_RECIPES);
    setSummaryText(DEMO_SUMMARY);
    setPreviewImageUrl(SAMPLE_FRIDGE_IMAGE);
    setIsDemo(true);
    setPreviousRecipes(null);
    setPreviousSummary(null);
    lastScan.current = null;
    removeStored(STORAGE_KEYS.lastScan);
  };

  const handleTriggerScanFromNav = () => {
    setSelectedRecipe(null);
    setActiveTab('recipes');
    requestAnimationFrame(() => {
      fileInputRef.current?.click();
    });
  };

  const historyEntries: ScanHistoryEntry[] = scanHistory.map((r) => ({
    id: r.id,
    scannedAt: r.scannedAt,
    summary: r.summary,
    recipeCount: r.recipes.length,
  }));

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
        lang={lang}
        onToggleLanguage={() => setLang((l) => (l === 'en' ? 'ur' : 'en'))}
        s={s}
      />

      {/* Shared-fridge import banner (from a #share= link) */}
      {pendingShare ? (
        <div className="no-print mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
          >
            <p className="text-sm text-emerald-900">
              Someone shared a fridge with you
              {pendingShare.fridge ? ` — "${pendingShare.fridge.name}"` : ''}.
              Import it as a new fridge?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleImportShare(pendingShare);
                  setPendingShare(null);
                }}
                className="rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {s.import}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingShare(null);
                  clearShareHash();
                }}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {s.cancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {legalView ? (
        <LegalPages view={legalView} onClose={() => setLegalView(null)} />
      ) : null}

      {activeCookingRecipe ? (
        <main>
          <CookingMode
            recipe={activeCookingRecipe}
            shoppingList={shoppingList}
            onAddMissingToShoppingList={handleAddMissingToShoppingList}
            onExit={() => setSelectedRecipe(null)}
            s={s}
          />
        </main>
      ) : activeTab === 'plan' ? (
        <main>
          <MealPlanner
            plan={mealPlan}
            recipes={syncedRecipes}
            fridgeNames={fridgeIngredientNames(fridgeIngredients)}
            onSetMeal={handleSetMeal}
            onClearMeal={handleClearMeal}
            onClearPlan={handleClearPlan}
            onAddPlanToShoppingList={handleAddPlanToShoppingList}
            s={s}
          />
        </main>
      ) : activeTab === 'shopping' ? (
        <main>
          <ShoppingListView
            items={shoppingList}
            onAddItem={handleAddManualShoppingItem}
            onUpdateItem={handleUpdateShoppingItem}
            onToggleItem={handleToggleShoppingItem}
            onDeleteItem={handleDeleteShoppingItem}
            onClearChecked={handleClearCheckedShoppingItems}
            onBrowseRecipes={() => setActiveTab('recipes')}
            s={s}
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
                    ? s.hideFilters
                    : s.showFilters}
                  {filters.dietary.length > 0
                    ? ` (${filters.dietary.length})`
                    : ''}
                </span>
              </button>
            </div>

            {/* Sidebar: Always visible on lg+, toggleable on mobile */}
            <div className={`no-print ${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
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
                fridgeProfiles={fridgeProfiles}
                activeFridgeId={activeFridgeIdResolved}
                onSelectFridge={handleSelectFridge}
                onAddFridge={handleAddFridge}
                onRenameFridge={handleRenameFridge}
                onDeleteFridge={handleDeleteFridge}
                onAddIngredient={handleAddIngredient}
                onUpdateIngredient={handleUpdateIngredient}
                onRemoveIngredient={handleRemoveIngredient}
                onRefreshWithAI={handleRefreshRecipesWithAI}
                isRefreshingAI={isAnalyzing}
                scanHistory={historyEntries}
                onRestoreScan={handleRestoreScan}
                onClearHistory={handleClearHistory}
                s={s}
              />
              <div className="mt-6">
                <SharePanel
                  activeFridge={activeProfile}
                  shoppingList={shoppingList}
                  mealPlan={mealPlan}
                  onImportShare={handleImportShare}
                  shareStatus={shareStatus}
                  s={s}
                />
              </div>
            </div>

            {/* Main Content: Fridge Scanner + Scrollable Recipe Cards */}
            <div className="min-w-0 flex-1 space-y-6">
              <FridgeScannerPanel
                previewImageUrl={previewImageUrl}
                summaryText={summaryText}
                isAnalyzing={isAnalyzing}
                scanStage={scanStage}
                scanElapsedSeconds={scanElapsedSeconds}
                errorMessage={errorMessage}
                isDemo={isDemo}
                onDismissError={() => setErrorMessage(null)}
                onAnalyzeFile={handleAnalyzeFile}
                onAnalyzeDataUrl={analyzeImageDataUrl}
                onClearScan={handleClearScan}
                onShowLegal={(view) => setLegalView(view)}
                fileInputRef={fileInputRef}
                s={s}
              />

              {/* Recipe Feed Header + Search */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-slate-900">
                    {s.suggestedRecipes}
                  </h2>
                  <p className="text-sm text-slate-600 tabular-nums">
                    {fmt(s.showingLine, {
                      shown: filteredRecipes.length,
                      total: syncedRecipes.length,
                    })}
                    {filters.dietary.length > 0
                      ? ` · ${filters.dietary.join(', ')}`
                      : ''}
                    {favoritesOnly ? ` · ${s.favouritesOnly}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFavoritesOnly((v) => !v)}
                    aria-pressed={favoritesOnly}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      favoritesOnly
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${favoritesOnly ? 'fill-rose-500 text-rose-500' : ''}`}
                      aria-hidden="true"
                    />
                    <span>
                      {s.favourites}
                      {favoriteCount > 0 ? ` (${favoriteCount})` : ''}
                    </span>
                  </button>

                  {previousRecipes ? (
                    <button
                      type="button"
                      onClick={handleUndoRefresh}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Undo2 className="h-4 w-4" aria-hidden="true" />
                      <span>{s.undoRefresh}</span>
                    </button>
                  ) : null}

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
                      placeholder={s.searchPlaceholder}
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
                    {favoritesOnly
                      ? s.noFavouriteRecipes
                      : s.noRecipesMatch}
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
                    {favoritesOnly
                      ? 'Tap the heart on any recipe card to save it here.'
                      : 'Try relaxing a dietary restriction or time limit, or ask AI to generate fresh recipes for your current ingredients.'}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    {favoritesOnly ? (
                      <button
                        type="button"
                        onClick={() => setFavoritesOnly(false)}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                      >
                        {s.showAllRecipes}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setFilters(DEFAULT_FILTERS)}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        >
                          {s.resetFilters}
                        </button>
                        <button
                          type="button"
                          onClick={handleRefreshRecipesWithAI}
                          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                        >
                          {s.generateRecipes}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  data-testid="recipe-grid"
                  className="grid grid-cols-1 gap-6 md:grid-cols-2"
                >
                  {filteredRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      shoppingList={shoppingList}
                      isFavorite={favorites.includes(recipe.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onAddMissingToShoppingList={handleAddMissingToShoppingList}
                      onSelectRecipe={(r) => setSelectedRecipe(r)}
                      s={s}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer — legal links */}
          <footer className="mt-12 border-t border-slate-200 pt-6 pb-4 text-center text-xs text-slate-500">
            <p>
              Mise — Smart Fridge &amp; Culinary Assistant. Photos are sent
              to OpenRouter and its AI model provider to detect ingredients.
            </p>
            <p className="mt-1.5">
              <button
                type="button"
                onClick={() => setLegalView('privacy')}
                className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
              >
                {s.privacyPolicy}
              </button>
              {' · '}
              <button
                type="button"
                onClick={() => setLegalView('terms')}
                className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
              >
                {s.terms}
              </button>
            </p>
          </footer>
        </main>
      )}
    </div>
  );
}
