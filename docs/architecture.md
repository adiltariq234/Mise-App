# Mise — Architecture Notes

Last updated: 15 November 2026

## Stack

- **Frontend:** React 19 + Vite 8 + Tailwind CSS 4 (SPA, no router)
- **Backend:** Express (`server.ts`), deployed as a Vercel serverless function
  via `api/index.ts` (static files served by Vercel from `dist/`)
- **AI:** OpenRouter, free vision model `nvidia/nemotron-3.5-super-vl:free`
  (override with `OPENROUTER_MODEL`)
- **Optional services:** Upstash Redis (rate limiting + async jobs) — see
  `.env.example`; the app works without it (in-memory rate limiting and
  synchronous AI calls)

## Data model (Phase 3 hooks)

All types live in `src/types/culinary.ts`.

- `FridgeIngredient` — `{ id, name, quantity?, category, source, addedAt,
  expiresAt? }`. `expiresAt` (ISO date `YYYY-MM-DD`) is the data-model
  hook for **expiry tracking**: the sidebar edit form already lets users
  set it and shows a "Use by … — soon" badge within 3 days. A future
  "expiring soon" digest can read the same field.
- `Recipe` — `isAiGenerated` distinguishes AI recipes from curated
  samples. `imageUrl` is set **only** when the photo genuinely depicts
  the dish; AI recipes have none and render a text-only card.
  `nutrition?` (per-serving protein/carbs/fat/fiber/sodium) is shown only
  when present — the app never invents macros. Ingredient amounts are
  free text; `utils/amounts.ts` parses a leading quantity for the
  servings scaler and leaves unquantified amounts unscaled (honest).
- `FridgeProfile` — `{ id, name, ingredients, createdAt }`. Multiple
  named fridges; the active one is tracked separately. Migrates from the
  old single-list key on first run (see `utils/fridges.ts`).
- `MealPlan` — `Partial<Record<WeekDay, { recipeId, servings }>>`: at most
  one recipe per day, Monday-first. Helpers in `utils/mealPlan.ts`
  (totals, missing-ingredient aggregation).
- `SharePayload` — `{ v: 1, kind: 'mise-share', exportedAt, fridge?,
  shoppingList?, mealPlan? }`, encoded as base64url JSON
  (`utils/sharing.ts`). Local-only family sharing; no backend.
- `ScanRecord` — `{ id, scannedAt, summary, ingredients, recipes,
  thumbnail? }`. This is the shape a future database-backed scan record
  will use; today it is stored in versioned localStorage.
- `ShoppingListItem` — carries `category` so lists group by aisle.

## Storage

`src/utils/storage.ts` wraps localStorage with `{ version, data }`
envelopes and safe try/catch. Keys (see `STORAGE_KEYS`):

| Key | Contents |
|---|---|
| `mise_fridge_v1` | Legacy single fridge inventory (read once for migration, no longer written) |
| `mise_fridges_v1` | Fridge profiles (`FridgeProfile[]`) |
| `mise_active_fridge_v1` | Active fridge profile id |
| `mise_meal_plan_v1` | Weekly meal plan (`MealPlan`) |
| `mise_lang_v1` | UI language (`'en'` / `'ur'`) |
| `mise_last_scan_v1` | Latest `ScanRecord` (with thumbnail) |
| `mise_scan_history_v1` | Last 5 scans (no thumbnails) |
| `mise_favorites_v1` | Favourite recipe ids |
| `mise_shopping_list_v1` | Shopping list |
| `mise_tts_voice_v1` | Selected read-aloud voice URI |

**Future database integration:** replace the `loadStored`/`saveStored`
calls in `App.tsx` with an adapter behind the same interface (e.g. a
`ScanStore` with `loadLastScan()` / `saveScan()`). The `ScanRecord`
shape is already DB-shaped; add a `userId` field when accounts exist.

## API

- `GET /api/health` — `{ ok, model, provider, rateLimit: { mode, ... },
  jobs: { enabled } }`
- `POST /api/analyze-fridge` — `{ imageBase64, mimeType?,
  dietaryRestrictions? }`. Returns 200 with
  `{ detectedIngredients, summary, recipes }`, or **202**
  `{ jobId, status: 'processing' }` when Redis is configured (async job).
- `POST /api/suggest-recipes` — `{ ingredients, dietaryRestrictions? }`.
  Same 200/202 behaviour.
- `GET /api/jobs/:id` — `{ status: 'processing'|'complete'|'failed',
  result?, error?, code? }` (Redis only; 404 otherwise).

Rate limits (per IP, fixed 1-hour window): 10 scans/hour, 20 recipe
generations/hour by default (`RATE_LIMIT_SCANS_PER_HOUR`,
`RATE_LIMIT_RECIPES_PER_HOUR`). Exceeding returns 429 with
`Retry-After` and `X-RateLimit-*` headers.

Image validation (server, `validateImageInput`): base64 must decode,
≤ 8 MB, and magic bytes must match JPEG/PNG/WebP. The client
compresses to ≤ 1024 px JPEG first (`src/utils/imagePrep.ts`).

Error contract: responses are `{ error, code? }` with stable codes
(`VALIDATION`, `RATE_LIMITED`, `AI_BUSY`, `AI_TIMEOUT`,
`AI_UNAVAILABLE`, `AI_EMPTY`, `JOB_NOT_FOUND`, `SERVER_ERROR`).
Raw provider bodies are never forwarded to the client.

## Why synchronous calls still exist

Vercel Hobby + Fluid compute evidently allows > 60 s functions (live
scans of 71 s and 84 s succeeded on 15 Nov 2026), but the limit is
undocumented and not guaranteed. The async-job path (Redis +
`waitUntil`) exists so long AI calls do not hold a client connection
open. When Redis is configured, the frontend polls `/api/jobs/:id`;
when it is not, calls run synchronously with a 150 s client timeout
and one server-side retry on empty/parse failures.

## Phase 3 — built 16 November 2026

All Phase 3 features are now built in the localStorage-based app (no
backend). Honest limits are documented where they apply.

| Feature | Status | Notes |
|---|---|---|
| Expiry tracking | Done (Phase 1) + digest-ready | `expiresAt` field, edit UI, "soon" badge, `expiringSoon()` helper |
| Weekly meal planning | **Built** | `MealPlanner` tab (Mon–Sun, one recipe/day + servings), weekly kcal total, missing essentials → shopping list (`utils/mealPlan.ts`) |
| Nutrition info | **Built (data-limited)** | Per-serving + total calories from `Recipe.calories`; macros shown only when `Recipe.nutrition` is present — never invented. No per-ingredient nutrition source yet |
| Allergen info | **Built (name-based)** | Keyword flags from ingredient names only (`utils/allergens.ts`); whole-word matching + plant-milk/flour exclusions; UI states the check is limited to listed ingredients |
| Serving-size adjustment | **Built** | Amount parser + scaler (`utils/amounts.ts`); stepper on cards + cooking mode; unquantified amounts shown as written |
| Recipe printing | **Built** | Print buttons (cooking mode, shopping list, meal planner) + `@media print` stylesheet in `index.css` |
| Favourites | Done (Phase 1) | — |
| Multiple fridges | **Built** | `FridgeProfile` + switcher/rename/delete in the sidebar; migration from the legacy single-list key (`utils/fridges.ts`) |
| Family sharing | **Built (local-only)** | Export/import via base64url share code or `#share=` link (`utils/sharing.ts`, `SharePanel`); a copy is imported, no live sync, no accounts — live multi-user sharing still needs a backend |
| English + Urdu | **Built (main UI)** | `utils/i18n.ts` dictionary (key parity enforced by test); header toggle, persisted; recipe text, errors and legal pages stay in English |
| PWA / offline | **Built (basics)** | `public/manifest.webmanifest` + `public/sw.js` (offline shell, stale-while-revalidate assets, API never cached); registered in `main.tsx` for production builds only |

## Testing

- `npm test` — `node --test` (Node 24 type stripping). Unit tests for
  `recipeLogic`, `categories`, `imageValidation`, `fridge`, `storage`,
  `amounts` (parsing/scaling/fractions), `allergens` (flags + false
  positives), `mealPlan` (set/clear/totals/missing), `fridges`
  (profiles + migration fallback), `sharing` (encode/decode round-trip
  + rejection of bad codes), `i18n` (EN/UR key parity + `fmt`);
  API tests in `server.test.ts` (validation, health, jobs 404,
  `sanitizeRecipes`, `validateImageInput`). No live AI calls in CI.
- `npm run lint` — `tsc --noEmit`.
- `npm run build` — Vite production build.
- CI: `.github/workflows/ci.yml` runs lint + tests + build on push/PR.
