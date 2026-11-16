import { Minus, Plus } from 'lucide-react';
import type { UiStrings } from '../utils/i18n.ts';

interface ServingsScalerProps {
  servings: number;
  baseServings: number;
  onChange: (servings: number) => void;
  s: UiStrings;
}

/**
 * Servings stepper. Changing the count rescales ingredient amounts via
 * `scaleRecipe` — amounts with no quantity stay as written (see
 * `utils/amounts.ts`). Clamped to 1–20 servings.
 */
export function ServingsScaler({ servings, baseServings, onChange, s }: ServingsScalerProps) {
  const dec = () => onChange(Math.max(1, servings - 1));
  const inc = () => onChange(Math.min(20, servings + 1));
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-slate-600">
        {s.servings}
        {servings !== baseServings ? ` (${baseServings} → ${servings})` : ''}
      </span>
      <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
        <button
          type="button"
          onClick={dec}
          disabled={servings <= 1}
          aria-label="Fewer servings"
          className="rounded-l-lg p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="min-w-6 text-center font-mono text-sm font-semibold text-slate-900 tabular-nums">
          {servings}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={servings >= 20}
          aria-label="More servings"
          className="rounded-r-lg p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}
