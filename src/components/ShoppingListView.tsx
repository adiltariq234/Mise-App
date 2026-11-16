import { useState, type FormEvent } from 'react';
import { Check, Copy, Pencil, Plus, Printer, ShoppingBag, Trash2, X } from 'lucide-react';
import type { FridgeCategory, ShoppingListItem } from '../types/culinary';
import { FRIDGE_CATEGORIES } from '../utils/categories';
import type { UiStrings } from '../utils/i18n.ts';
import { fmt, getStrings } from '../utils/i18n.ts';

interface ShoppingListViewProps {
  items: ShoppingListItem[];
  onAddItem: (name: string, amount: string, category?: FridgeCategory) => void;
  onUpdateItem: (
    id: string,
    patch: Partial<Pick<ShoppingListItem, 'name' | 'amount' | 'category'>>,
  ) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearChecked: () => void;
  onBrowseRecipes: () => void;
  s?: UiStrings;
}

export function ShoppingListView({
  items,
  onAddItem,
  onUpdateItem,
  onToggleItem,
  onDeleteItem,
  onClearChecked,
  onBrowseRecipes,
  s = getStrings('en'),
}: ShoppingListViewProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<FridgeCategory>('Other');
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<FridgeCategory>('Other');

  const remainingCount = items.filter((i) => !i.checked).length;
  const checkedCount = items.length - remainingCount;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onAddItem(trimmedName, amount.trim() || '1 unit', category);
    setName('');
    setAmount('');
    setCategory('Other');
  };

  const handleCopy = async () => {
    const lines: string[] = ['Mise — Shopping List', ''];
    for (const cat of FRIDGE_CATEGORIES) {
      const group = items.filter((i) => (i.category || 'Other') === cat);
      if (group.length === 0) continue;
      lines.push(`${cat}:`);
      for (const item of group) {
        lines.push(`  ${item.checked ? '[x]' : '[ ]'} ${item.name} (${item.amount})`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure in restricted contexts
    }
  };

  const startEditing = (item: ShoppingListItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAmount(item.amount);
    setEditCategory(item.category || 'Other');
  };

  const saveEditing = () => {
    if (!editingId) return;
    onUpdateItem(editingId, {
      name: editName.trim() || undefined,
      amount: editAmount.trim() || undefined,
      category: editCategory,
    });
    setEditingId(null);
  };

  const grouped = FRIDGE_CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((i) => (i.category || 'Other') === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-[920px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            {s.shoppingList}
          </h1>
          <p className="mt-1 text-sm text-slate-600 tabular-nums">
            {remainingCount} {s.itemsToPickUp}
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
              <span>{copied ? s.copied : s.copyList}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>{s.print}</span>
            </button>
            {checkedCount > 0 ? (
              <button
                type="button"
                onClick={onClearChecked}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>{s.clearChecked}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Quick Add Form */}
      <form
        onSubmit={handleSubmit}
        className="no-print mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="shopping-item-name"
            className="block text-xs font-medium text-slate-700"
          >
            {s.addItemLabel}
          </label>
          <input
            id="shopping-item-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={s.itemPlaceholder}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
          />
        </div>
        <div className="sm:w-32">
          <label
            htmlFor="shopping-item-amount"
            className="block text-xs font-medium text-slate-700"
          >
            {s.quantity}
          </label>
          <input
            id="shopping-item-amount"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={s.quantityPlaceholder}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
          />
        </div>
        <div className="sm:w-36">
          <label
            htmlFor="shopping-item-category"
            className="block text-xs font-medium text-slate-700"
          >
            {s.category}
          </label>
          <select
            id="shopping-item-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as FridgeCategory)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
          >
            {FRIDGE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{s.addItem}</span>
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
            {s.listEmpty}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            {s.listEmptyHint}
          </p>
          <button
            type="button"
            onClick={onBrowseRecipes}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <span>{s.browseRecipes}</span>
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {grouped.map(({ category: cat, items: groupItems }) => (
            <section key={cat} aria-label={`${cat} shopping items`}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {cat}
              </h2>
              <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {groupItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70"
                  >
                    {editingId === item.id ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label="Item name"
                          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-emerald-700 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          aria-label="Item quantity"
                          className="w-24 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-emerald-700 focus:outline-none"
                        />
                        <select
                          value={editCategory}
                          onChange={(e) =>
                            setEditCategory(e.target.value as FridgeCategory)
                          }
                          aria-label="Item category"
                          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-emerald-700 focus:outline-none"
                        >
                          {FRIDGE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={saveEditing}
                          aria-label="Save changes"
                          className="rounded-md bg-emerald-700 p-2 text-white hover:bg-emerald-800"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel editing"
                          className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <>
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
                                {fmt(s.forRecipe, { title: item.sourceRecipe })}
                              </p>
                            ) : null}
                          </div>
                        </label>

                        <span className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            aria-label={`Edit ${item.name}`}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            aria-label={`Delete ${item.name}`}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
