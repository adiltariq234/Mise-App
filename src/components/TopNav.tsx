import { CalendarDays, Camera, Languages, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { Language, UiStrings } from '../utils/i18n.ts';
import { getStrings } from '../utils/i18n.ts';

export type ActiveTab = 'recipes' | 'shopping' | 'plan';

interface TopNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  shoppingCount: number;
  onTriggerScan: () => void;
  lang?: Language;
  onToggleLanguage?: () => void;
  s?: UiStrings;
}

export function TopNav({
  activeTab,
  onSelectTab,
  shoppingCount,
  onTriggerScan,
  lang = 'en',
  onToggleLanguage,
  s = getStrings('en'),
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-3 py-3 sm:gap-8 sm:px-6 sm:py-3.5 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('recipes');
          }}
          className="flex items-center gap-2 font-display text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          <img
            src="/mise-logo.png"
            alt="Fridjo logo"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover"
          />
          Fridjo
        </a>

        {/* Zone 2: Single-Line Navigation Links.
            On phones the labels hide and only the icons show: with all three
            zones shrink-0 + nowrap the full row measured ~440px wide and
            overflowed a 390px viewport (the page scrolled sideways). */}
        <nav
          aria-label="Primary navigation"
          className="flex min-w-0 items-center gap-3.5 text-xs sm:gap-6 sm:text-sm font-medium"
        >
          <button
            type="button"
            onClick={() => onSelectTab('recipes')}
            className={`inline-flex items-center gap-1.5 sm:gap-2 border-b-2 py-1 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 ${
              activeTab === 'recipes'
                ? 'border-emerald-700 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{s.recipes}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('plan')}
            className={`inline-flex items-center gap-1.5 sm:gap-2 border-b-2 py-1 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 ${
              activeTab === 'plan'
                ? 'border-emerald-700 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{s.mealPlan}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('shopping')}
            className={`inline-flex items-center gap-1.5 sm:gap-2 border-b-2 py-1 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 ${
              activeTab === 'shopping'
                ? 'border-emerald-700 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {s.shoppingList}
              {shoppingCount > 0 ? (
                <span className="ml-1 font-mono text-xs text-emerald-700 tabular-nums">
                  ({shoppingCount})
                </span>
              ) : null}
            </span>
          </button>
        </nav>

        {/* Zone 3: Language toggle + single primary action */}
        <div className="flex shrink-0 items-center gap-2">
          {onToggleLanguage ? (
            <button
              type="button"
              onClick={onToggleLanguage}
              aria-label={s.language}
              title={s.language}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <Languages className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              {/* Label hidden on phones (icons-only header, see Zone 2 note). */}
              <span className="hidden sm:inline">{lang === 'en' ? 'اردو' : 'EN'}</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onTriggerScan}
            aria-label={s.scanFridge}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-emerald-700 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="sm:hidden">{s.scan}</span>
            <span className="hidden sm:inline">{s.scanFridge}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
