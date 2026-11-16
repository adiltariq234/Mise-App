import { useMemo, useState } from 'react';
import { Check, Link2, Share2, Upload } from 'lucide-react';
import type {
  FridgeProfile,
  MealPlan,
  ShoppingListItem,
} from '../types/culinary';
import {
  buildSharePayload,
  decodeShare,
  encodeShare,
  type SharePayload,
} from '../utils/sharing.ts';
import type { UiStrings } from '../utils/i18n.ts';
import { getStrings } from '../utils/i18n.ts';

interface SharePanelProps {
  activeFridge: FridgeProfile | undefined;
  shoppingList: ShoppingListItem[];
  mealPlan: MealPlan;
  /** Import a decoded payload; returns a short human-readable summary. */
  onImportShare: (payload: SharePayload) => string;
  shareStatus: string | null;
  s?: UiStrings;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Family sharing, local-only: packs a copy of the active fridge, the
 * shopping list and the meal plan into a share code (link or pasted text).
 * The receiver imports a copy into their own browser. No accounts, no
 * live sync — see utils/sharing.ts and the note below the buttons.
 */
export function SharePanel({
  activeFridge,
  shoppingList,
  mealPlan,
  onImportShare,
  shareStatus,
  s = getStrings('en'),
}: SharePanelProps) {
  const [importCode, setImportCode] = useState('');
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const code = useMemo(() => {
    const payload = buildSharePayload({
      fridge: activeFridge
        ? { name: activeFridge.name, ingredients: activeFridge.ingredients }
        : undefined,
      shoppingList,
      mealPlan,
    });
    return encodeShare(payload);
  }, [activeFridge, shoppingList, mealPlan]);

  const shareLink = code
    ? `${window.location.origin}${window.location.pathname}#share=${code}`
    : null;

  const handleCopy = async (kind: 'link' | 'code') => {
    const text = kind === 'link' ? shareLink : code;
    if (!text) return;
    if (await copyText(text)) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } else {
      setImportMessage(
        'Copy did not work in this browser — select the code below and copy it manually.',
      );
    }
  };

  const handleImport = () => {
    const decoded = decodeShare(importCode);
    if (!decoded.ok) {
      setImportMessage(decoded.error);
      return;
    }
    const summary = onImportShare(decoded.payload);
    setImportMessage(summary);
    setImportCode('');
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="inline-flex items-center gap-1.5 text-base font-semibold text-slate-900">
        <Share2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
        {s.shareTitle}
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{s.shareIntro}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!shareLink}
          onClick={() => handleCopy('link')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied === 'link' ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{copied === 'link' ? s.linkCopied : s.copyLink}</span>
        </button>
        <button
          type="button"
          disabled={!code}
          onClick={() => handleCopy('code')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied === 'code' ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{copied === 'code' ? s.codeCopied : s.copyCode}</span>
        </button>
      </div>
      {!code ? (
        <p className="mt-2 text-xs text-amber-800">
          This fridge is too large to share as a link. Remove some items and try again.
        </p>
      ) : null}

      <div className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">{s.importCode}</h3>
        <label className="sr-only" htmlFor="share-code-input">
          {s.pasteCodePlaceholder}
        </label>
        <textarea
          id="share-code-input"
          value={importCode}
          onChange={(e) => setImportCode(e.target.value)}
          placeholder={s.pasteCodePlaceholder}
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={!importCode.trim()}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{s.import}</span>
        </button>
      </div>

      {importMessage || shareStatus ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          {importMessage || shareStatus}
        </p>
      ) : null}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        {s.shareLocalNote}
      </p>
    </section>
  );
}
