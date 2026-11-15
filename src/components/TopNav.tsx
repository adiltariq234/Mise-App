import { Camera, ShoppingBag, UtensilsCrossed } from 'lucide-react';

export type ActiveTab = 'recipes' | 'shopping';

interface TopNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  shoppingCount: number;
  onTriggerScan: () => void;
}

export function TopNav({
  activeTab,
  onSelectTab,
  shoppingCount,
  onTriggerScan,
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
          className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          Mise
        </a>

        {/* Zone 2: Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-3.5 text-xs sm:gap-6 sm:text-sm font-medium"
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
            <span>Recipes</span>
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
            <span>
              Shopping List
              {shoppingCount > 0 ? (
                <span className="ml-1 font-mono text-xs text-emerald-700 tabular-nums">
                  ({shoppingCount})
                </span>
              ) : null}
            </span>
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onTriggerScan}
            aria-label="Scan Fridge"
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-emerald-700 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="sm:hidden">Scan</span>
            <span className="hidden sm:inline">Scan Fridge</span>
          </button>
        </div>
      </div>
    </header>
  );
}
