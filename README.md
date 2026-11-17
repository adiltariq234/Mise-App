# Mise — Smart Fridge & Culinary Assistant

Snap a photo of your open fridge to identify ingredients, filter recipes by diet, cook hands-free with read-aloud steps, and add missing essentials to your shopping list.

AI runs on **OpenRouter** (free vision model `nvidia/nemotron-3.5-super-vl:free` by default) — no Gemini key needed.

Live: https://mise-app-olive.vercel.app/

## Features

- **AI fridge scanner** — photo upload (JPG/PNG/WebP, auto-compressed to ≤1024 px), mobile camera capture, staged scan progress, 150 s client timeout, one automatic retry on empty AI replies, friendly error messages, duplicate-submission guard. HEIC photos get a clear message instead of a silent failure.
- **Scan persistence** — the latest scan (ingredients, recipes, summary, thumbnail) and the last 5 scans are saved in versioned localStorage and restored on reload. Manual fridge items survive new scans; scanned items are refreshed.
- **Ingredient management** — add/edit/delete ingredients with quantity, category (Vegetables, Fruits, Dairy, Meat, Seafood, Grains, Spices, Beverages, Other), auto-categorization of scanned items, and an optional use-by date with an "expiring soon" badge.
- **Recipe generator** — AI recipes from your fridge contents, with filters (dietary, time, difficulty), search, favourites, and scan history with restore. AI recipes never show a misleading stock photo — they render a clean text-only card when no real dish photo exists.
- **Serving-size adjustment** — a servings stepper on recipe cards and in cooking mode scales ingredient amounts to the chosen serving count. Amounts are parsed from the recipe text; amounts with no quantity ("a pinch", "to taste", ranges like "1-2 cloves") cannot be scaled honestly and are shown as written, with a note saying so. Per-serving calories never change; only the total does.
- **Nutrition display** — per-serving calories (from the recipe data) and the total for the chosen servings. Macros (protein/carbs/fat) are shown only when the recipe data carries them; the app never invents them.
- **Allergen flags** — derived only from ingredient names via a conservative keyword list (milk, egg, wheat, peanut, tree nut, soy, fish, shellfish, sesame, mustard, celery), with whole-word matching so "eggplant" does not flag egg and "almond milk" does not flag dairy. The UI says the check is limited to the listed ingredients.
- **Weekly meal planner** — pick one recipe per day (Mon–Sun) with servings; the planner totals weekly calories and can add the planned meals' missing essentials (scaled to the planned servings) to the shopping list.
- **Multiple fridges** — named fridge profiles (e.g. "Home Fridge", "Garage Fridge"), each with its own ingredient list; scans land in the active fridge. The old single-list storage migrates automatically into one "Home Fridge" profile.
- **Family sharing (local-only)** — share a copy of the active fridge, shopping list and meal plan as a link (`#share=<code>`) or pasted code. The receiver imports a copy into their own browser. No accounts, no live sync — changes after sharing are not shared.
- **Urdu UI toggle** — the main interface (navigation, headings, buttons, labels) switches between English and Urdu from the header; the choice persists. Recipe text, error messages and legal pages stay in English for now.
- **PWA basics** — web manifest + service worker: the app is installable and opens offline (app shell cached; fridge, shopping list, meal plan and favourites all live in localStorage). API calls are never cached — AI features need a connection.
- **Printing** — Print buttons on cooking mode, the shopping list and the meal planner; the print stylesheet hides the header, sidebar, buttons and form controls so only the content prints.
- **Login & account sync (Supabase)** — optional Google or email sign-in (sidebar panel). Signed-in users get their fridges, scans, recipes, favourites, shopping list and meal plan saved to their Supabase account and synced across devices; first sign-in offers a one-time upload of the local data (the local copy is kept either way). Guests keep using localStorage exactly as before — sign-in is never a gate.
- **Cooking mode** — step-by-step hands-free cooking with a step timer (start / pause / resume / reset), read-aloud text-to-speech with voice selection and speed control, and a friendly message when the browser does not support speech.
- **Shopping list** — add/edit/delete items, check off, clear checked, copy/share (grouped by category), persisted across reloads.
- **Privacy & legal** — Privacy Policy and Terms in the app, plus an AI image-processing disclosure and consent notice on the scanner. Photos are sent to OpenRouter and its model provider; they are not stored on Mise's server.
- **Security** — per-IP rate limiting on AI endpoints (10 scans/hour, 20 recipe generations/hour by default; HTTP 429 with `Retry-After`), server-side image validation by magic bytes (JPEG/PNG/WebP, ≤8 MB), input sanitization, friendly error codes (raw provider errors are never forwarded), restrictive CORS (same-origin by default), and security headers (CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).

## Run Locally

**Prerequisites:** Node.js 24+ (or Bun)

1. Install dependencies:
   `bun install` (or `npm install`)
2. Set `OPENROUTER_API_KEY` in `.env.local` — create a free key at https://openrouter.ai/keys
3. Run the app:
   `npm run dev` (or `bun run dev`)

The server listens on port 3000. `/api/health` reports the active model, rate-limit mode, and whether async jobs are enabled.

## Environment variables

See `.env.example` for the full list. The important ones:

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | Required. AI key (Vercel: Production + Preview + Development). |
| `OPENROUTER_MODEL` | Optional. Defaults to `nvidia/nemotron-3.5-super-vl:free`. |
| `ALLOWED_ORIGINS` | Optional. Extra CORS origins (empty = same-origin only). |
| `RATE_LIMIT_SCANS_PER_HOUR` / `RATE_LIMIT_RECIPES_PER_HOUR` | Optional. Defaults 10 / 20. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Optional but recommended. Enables shared rate limiting and async AI jobs (202 + polling). Without them the app still works with in-memory rate limiting and synchronous AI calls. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Optional. Supabase project URL + publishable key (public by design). Without them the app works as a guest and the sign-in panel does not appear. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional, server-only. Lets the server verify user tokens (`GET /api/auth/me`). Never give it a `VITE_` prefix, never commit it, never log it. |

## Login & database (Supabase)

The Supabase project is **"mise"** (https://woczqvbzrxekfckhfyui.supabase.co, region ap-south-1, Free Plan). Auth is Google + email (Supabase Auth); the database tables live in `supabase/migrations/0001_mise_core.sql`.

**One-time setup (Adil, in the Supabase dashboard):**

1. SQL Editor → paste `supabase/migrations/0001_mise_core.sql` → Run. This creates `profiles`, `fridge_profiles`, `scans`, `favorites`, `shopping_items`, `meal_plans` — all with row-level security so a user can only read/write their own rows.
2. Authentication → Providers → enable **Google** (add the OAuth client id/secret) — email sign-in is on by default. Set the Site URL to https://mise-app-olive.vercel.app/ so confirmation links land back in the app.
3. Redeploy (env vars are already set in Vercel for Production + Preview).

**How sync works:** a signed-in user sees an "Upload my data" prompt once; after that, every change syncs to their account (debounced ~1 s) and a fresh sign-in loads the account copy. If local work is newer than the account copy (guest use while signed out), the app asks before overwriting it. Guests never see sign-in and lose nothing. `GET /api/health` reports `auth.configured`; `GET /api/auth/me` (Bearer token) verifies a session server-side.

## Async AI jobs

When Upstash Redis is configured, `POST /api/analyze-fridge` and `POST /api/suggest-recipes` return **202** `{ jobId, status: 'processing' }` and the AI work runs in the background; the client polls `GET /api/jobs/:id` every 3 s. Without Redis, the same endpoints return **200** synchronously (verified: live scans complete in ~70–85 s).

## Testing

```bash
npm run lint   # tsc --noEmit
npm test       # node --test — unit + API tests (no live AI calls)
npm run build  # Vite production build
```

CI (`.github/workflows/ci.yml`) runs lint + tests + build on every push/PR to `main`.

## Docs

- `docs/architecture.md` — data model, storage, API, and the Phase 3 roadmap
- `docs/runbook.md` — deployment, key rotation, rollback, Upstash setup, troubleshooting
