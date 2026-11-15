import { useState, type FormEvent } from 'react';
import { Check, History, Pencil, Plus, RotateCcw, Sparkles, X } from 'lucide-react';
import type {
  DietaryRestriction,
  DifficultyLevel,
  FilterState,
  FridgeCategory,
  FridgeIngredient,
} from '../types/culinary';
import { FRIDGE_CATEGORIES } from '../utils/categories';

const DIETARY_OPTIONS: DietaryRestriction[] = [
  'Vegetarian',
  'Vegan',
  'Keto',
  'Gluten-Free',
  'Dairy-Free',
  'High-Protein',
];

const PREP_TIME_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Any time', value: null },
  { label: 'Under 15 min', value: 15 },
  { label: 'Under 30 min', value: 30 },
  { label: 'Under 45 min', value: 45 },
];

const DIFFICULTY_OPTIONS: Array<DifficultyLevel | 'All'> = [
  'All',
  'Easy',
  'Medium',
  'Hard',
];

export interface ScanHistoryEntry {
  id: string;
  scannedAt: number;
  summary: string;
  recipeCount: number;
}

interface FilterSidebarProps {
  filters: FilterState;
  onToggleDietary: (tag: DietaryRestriction) => void;
  onSetMaxPrepTime: (minutes: number | null) => void;
  onSetDifficulty: (difficulty: DifficultyLevel | 'All') => void;
  onResetFilters: () => void;
  fridgeIngredients: FridgeIngredient[];
  onAddIngredient: (name: string, quantity?: string, category?: FridgeCategory) => void;
  onUpdateIngredient: (
    id: string,
    patch: Partial<Pick<FridgeIngredient, 'name' | 'quantity' | 'category' | 'expiresAt'>>,
  ) => void;
  onRemoveIngredient: (id: string) => void;
  onRefreshWithAI: () => void;
  isRefreshingAI: boolean;
  scanHistory: ScanHistoryEntry[];
  onRestoreScan: (id: string) => void;
  onClearHistory: () => void;
}

function formatScanDate(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

function isExpiringSoon(item: FridgeIngredient): boolean {
  if (!item.expiresAt) return false;
  const now = new Date();
  const d = new Date(`${item.expiresAt}T23:59:59`);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 3);
  return d >= now && d <= limit;
}

export function FilterSidebar({
  filters,
  onToggleDietary,
  onSetMaxPrepTime,
  onSetDifficulty,
  onResetFilters,
  fridgeIngredients,
  onAddIngredient,
  onUpdateIngredient,
  onRemoveIngredient,
  onRefreshWithAI,
  isRefreshingAI,
  scanHistory,
  onRestoreScan,
  onClearHistory,
}: FilterSidebarProps) {
  const [newIngredient, setNewIngredient] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editCategory, setEditCategory] = useState<FridgeCategory>('Other');
  const [editExpiresAt, setEditExpiresAt] = useState('');

  const hasActiveFilters =
    filters.dietary.length > 0 ||
    filters.maxPrepTime !== null ||
    filters.difficulty !== 'All' ||
    filters.searchQuery.trim().length > 0;

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newIngredient.trim();
    if (!trimmed) return;
    onAddIngredient(trimmed, newQuantity.trim() || undefined);
    setNewIngredient('');
    setNewQuantity('');
  };

  const startEditing = (item: FridgeIngredient) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQuantity(item.quantity || '');
    setEditCategory(item.category);
    setEditExpiresAt(item.expiresAt || '');
  };

  const saveEditing = () => {
    if (!editingId) return;
    onUpdateIngredient(editingId, {
      name: editName.trim() || undefined,
      quantity: editQuantity.trim() || undefined,
      category: editCategory,
      expiresAt: editExpiresAt || null,
    });
    setEditingId(null);
  };

  const grouped = FRIDGE_CATEGORIES.map((cat) => ({
    category: cat,
    items: fridgeIngredients.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      aria-label="Dietary filters and fridge ingredients"
      className="w-full shrink-0 space-y-6 lg:w-[272px]"
    >
      {/* Dietary & Cooking Constraints */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Dietary Filters
          </h2>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          ) : null}
        </div>

        <div className="mt-4 space-y-2.5">
          {DIETARY_OPTIONS.map((option) => {
            const checked = filters.dietary.includes(option);
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleDietary(option)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                  />
                  <span
                    className={
                      checked
                        ? 'font-semibold text-slate-900'
                        : 'font-normal text-slate-700'
                    }
                  >
                    {option}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {/* Total Time */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-900">Total Time</h3>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {PREP_TIME_OPTIONS.map((opt) => {
              const active = filters.maxPrepTime === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onSetMaxPrepTime(opt.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mt-5 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-900">Difficulty</h3>
          <div className="mt-2.5 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {DIFFICULTY_OPTIONS.map((level) => {
              const active = filters.difficulty === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onSetDifficulty(level)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fridge Ingredients — full management */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            In Your Fridge
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {fridgeIngredients.length} items
          </span>
        </div>

        <form onSubmit={handleAddSubmit} className="mt-3 space-y-2">
          <div className="flex gap-2">
            <label htmlFor="add-fridge-ingredient" className="sr-only">
              Add fridge ingredient
            </label>
            <input
              id="add-fridge-ingredient"
              type="text"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              placeholder="Add ingredient..."
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Add ingredient to fridge"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <input
            type="text"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder="Quantity (optional, e.g. 200 g)"
            aria-label="Quantity for new ingredient"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
          />
        </form>

        {fridgeIngredients.length === 0 ? (
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            No ingredients listed yet. Snap a fridge photo or add ingredients above.
          </p>
        ) : (
          <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
            {grouped.map(({ category, items }) => (
              <div key={category}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {category}
                </p>
                <ul className="mt-1 space-y-1">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {editingId === item.id ? (
                        <div className="space-y-2 py-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            aria-label="Ingredient name"
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-emerald-700 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              placeholder="Quantity"
                              aria-label="Ingredient quantity"
                              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-emerald-700 focus:outline-none"
                            />
                            <select
                              value={editCategory}
                              onChange={(e) =>
                                setEditCategory(e.target.value as FridgeCategory)
                              }
                              aria-label="Ingredient category"
                              className="rounded-md border border-slate-300 px-1.5 py-1 text-sm focus:border-emerald-700 focus:outline-none"
                            >
                              {FRIDGE_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <label htmlFor={`expiry-${item.id}`} className="text-xs text-slate-500">
                              Use by
                            </label>
                            <input
                              id={`expiry-${item.id}`}
                              type="date"
                              value={editExpiresAt}
                              onChange={(e) => setEditExpiresAt(e.target.value)}
                              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-emerald-700 focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEditing}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate">
                              {item.name}
                              {item.quantity ? (
                                <span className="text-slate-500"> · {item.quantity}</span>
                              ) : null}
                            </span>
                            {item.expiresAt ? (
                              <span
                                className={`block text-[11px] ${
                                  isExpiringSoon(item)
                                    ? 'font-medium text-amber-700'
                                    : 'text-slate-400'
                                }`}
                              >
                                Use by {item.expiresAt}
                                {isExpiringSoon(item) ? ' — soon' : ''}
                              </span>
                            ) : null}
                          </span>
                          <span className="flex shrink-0 items-center">
                            <button
                              type="button"
                              onClick={() => startEditing(item)}
                              aria-label={`Edit ${item.name}`}
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveIngredient(item.id)}
                              aria-label={`Remove ${item.name} from fridge`}
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onRefreshWithAI}
          disabled={isRefreshingAI || fridgeIngredients.length === 0}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
          <span>
            {isRefreshingAI ? 'Generating Recipes...' : 'Refresh Recipes with AI'}
          </span>
        </button>
      </section>

      {/* Recent scans — recipe history */}
      {scanHistory.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h2 className="inline-flex items-center gap-1.5 text-base font-semibold text-slate-900">
              <History className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Recent Scans
            </h2>
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Clear
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {scanHistory.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onRestoreScan(entry.id)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
                >
                  <span className="block font-medium text-slate-800">
                    {formatScanDate(entry.scannedAt)}
                    {' · '}
                    {entry.recipeCount} recipes
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-slate-500">
                    {entry.summary}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
