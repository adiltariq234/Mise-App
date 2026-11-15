import { useState, type FormEvent } from 'react';
import { Plus, RotateCcw, Sparkles, X } from 'lucide-react';
import type {
  DietaryRestriction,
  DifficultyLevel,
  FilterState,
} from '../types/culinary';

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

interface FilterSidebarProps {
  filters: FilterState;
  onToggleDietary: (tag: DietaryRestriction) => void;
  onSetMaxPrepTime: (minutes: number | null) => void;
  onSetDifficulty: (difficulty: DifficultyLevel | 'All') => void;
  onResetFilters: () => void;
  fridgeIngredients: string[];
  onAddIngredient: (name: string) => void;
  onRemoveIngredient: (name: string) => void;
  onRefreshWithAI: () => void;
  isRefreshingAI: boolean;
}

export function FilterSidebar({
  filters,
  onToggleDietary,
  onSetMaxPrepTime,
  onSetDifficulty,
  onResetFilters,
  fridgeIngredients,
  onAddIngredient,
  onRemoveIngredient,
  onRefreshWithAI,
  isRefreshingAI,
}: FilterSidebarProps) {
  const [newIngredient, setNewIngredient] = useState('');

  const hasActiveFilters =
    filters.dietary.length > 0 ||
    filters.maxPrepTime !== null ||
    filters.difficulty !== 'All' ||
    filters.searchQuery.trim().length > 0;

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newIngredient.trim();
    if (!trimmed) return;
    onAddIngredient(trimmed);
    setNewIngredient('');
  };

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

      {/* Detected Fridge Ingredients */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            In Your Fridge
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {fridgeIngredients.length} items
          </span>
        </div>

        <form onSubmit={handleAddSubmit} className="mt-3 flex gap-2">
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
        </form>

        {fridgeIngredients.length === 0 ? (
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            No ingredients listed yet. Snap a fridge photo or add ingredients above.
          </p>
        ) : (
          <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto pr-1">
            {fridgeIngredients.map((item) => (
              <li
                key={item}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                <span className="truncate">{item}</span>
                <button
                  type="button"
                  onClick={() => onRemoveIngredient(item)}
                  aria-label={`Remove ${item} from fridge`}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
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
    </aside>
  );
}
