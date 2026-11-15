import { useState, type FormEvent } from 'react';
import { Check, Copy, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { ShoppingListItem } from '../types/culinary';

interface ShoppingListViewProps {
  items: ShoppingListItem[];
  onAddItem: (name: string, amount: string) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearChecked: () => void;
  onBrowseRecipes: () => void;
}

export function ShoppingListView({
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onClearChecked,
  onBrowseRecipes,
}: ShoppingListViewProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(false);

  const remainingCount = items.filter((i) => !i.checked).length;
  const checkedCount = items.length - remainingCount;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onAddItem(trimmedName, amount.trim() || '1 unit');
    setName('');
    setAmount('');
  };

  const handleCopy = async () => {
    const text = items
      .map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.name} (${i.amount})`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure in restricted contexts
    }
  };

  return (
    <div className="mx-auto max-w-[920px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            Shopping List
          </h1>
          <p className="mt-1 text-sm text-slate-600 tabular-nums">
            {remainingCount} {remainingCount === 1 ? 'item' : 'items'} to pick up
            {checkedCount > 0 ? ` · ${checkedCount} checked` : ''}
          </p>
        </div>

        {items.length > 0 ? (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{copied ? 'Copied' : 'Copy List'}</span>
            </button>
            {checkedCount > 0 ? (
              <button
                type="button"
                onClick={onClearChecked}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Clear Checked</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Quick Add Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="shopping-item-name"
            className="block text-xs font-medium text-slate-700"
          >
            Ingredient or grocery item
          </label>
          <input
            id="shopping-item-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Feta Cheese, Fresh Dill, Tahini"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
          />
        </div>
        <div className="sm:w-40">
          <label
            htmlFor="shopping-item-amount"
            className="block text-xs font-medium text-slate-700"
          >
            Quantity
          </label>
          <input
            id="shopping-item-amount"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 200 g"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Item</span>
        </button>
      </form>

      {/* Shopping Items or Empty State */}
      {items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <ShoppingBag
            className="mx-auto h-9 w-9 text-slate-400"
            aria-hidden="true"
          />
          <h2 className="mt-3 font-display text-xl font-semibold text-slate-900">
            Your shopping list is empty
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            Missing an essential ingredient in a recipe? Click one-click add on any recipe card, or type items above.
          </p>
          <button
            type="button"
            onClick={onBrowseRecipes}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <span>Browse Recipes</span>
          </button>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70"
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3.5">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => onToggleItem(item.id)}
                  aria-label={`Mark ${item.name} as purchased`}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2.5">
                    <span
                      className={`text-sm font-medium ${
                        item.checked
                          ? 'text-slate-400 line-through'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      {item.amount}
                    </span>
                  </div>
                  {item.sourceRecipe ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      For {item.sourceRecipe}
                    </p>
                  ) : null}
                </div>
              </label>

              <button
                type="button"
                onClick={() => onDeleteItem(item.id)}
                aria-label={`Delete ${item.name}`}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 shrink-0"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
