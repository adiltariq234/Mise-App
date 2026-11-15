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
- `ScanRecord` — `{ id, scannedAt, summary, ingredients, recipes,
  thumbnail? }`. This is the shape a future database-backed scan record
  will use; today it is stored in versioned localStorage.
- `ShoppingListItem` — carries `category` so lists group by aisle.

## Storage

`src/utils/storage.ts` wraps localStorage with `{ version, data }`
envelopes and safe try/catch. Keys (see `STORAGE_KEYS`):

| Key | Contents |
|---|---|
| `mise_fridge_v1` | Fridge inventory (`FridgeIngredient[]`) |
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

## Phase 3 roadmap (architecture-ready, not yet built)

| Feature | What is ready | What remains |
|---|---|---|
| Expiry tracking | `expiresAt` field, edit UI, "soon" badge, `expiringSoon()` helper | Digest/reminder UI, expiry sort |
| Weekly meal planning | `ScanRecord` + recipe history give the data shape | Planner UI, day assignment, shopping aggregation |
| Nutrition info | `Recipe.calories` exists; per-ingredient nutrition needs a data source | Nutrition API or database, per-serving macros |
| Allergen info | `Recipe.ingredients` names are structured | Allergen taxonomy + flags on ingredients/recipes |
| Serving-size adjustment | `Recipe.servings` exists | Structured amounts (currently free text like "3 large") — needs an amount parser before scaling is honest |
| Recipe printing | — | Print stylesheet + `window.print()` action |
| Favourites | Done (Phase 1) | — |
| Multiple fridges | `ScanRecord` per scan; inventory is a single list today | Fridge entity + switcher |
| Family sharing | — | Accounts + shared lists (needs the account-model decision, P1-5) |
| English + Urdu | — | i18n framework + Urdu strings |
| PWA / offline | Shopping list already persists locally | Manifest, service worker, offline scan queue |

## Testing

- `npm test` — `node --test` (Node 24 type stripping). Unit tests for
  `recipeLogic`, `categories`, `imageValidation`, `fridge`, `storage`;
  API tests in `server.test.ts` (validation, health, jobs 404,
  `sanitizeRecipes`, `validateImageInput`). No live AI calls in CI.
- `npm run lint` — `tsc --noEmit`.
- `npm run build` — Vite production build.
- CI: `.github/workflows/ci.yml` runs lint + tests + build on push/PR.
