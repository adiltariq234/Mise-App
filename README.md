# Mise — Smart Fridge & Culinary Assistant

Snap a photo of your open fridge to identify ingredients, filter recipes by diet, cook hands-free with read-aloud steps, and add missing essentials to your shopping list.

AI runs on **OpenRouter** (free vision model `nvidia/nemotron-3.5-super-vl:free` by default) — no Gemini key needed.

Live: https://mise-app-olive.vercel.app/

## Features

- **AI fridge scanner** — photo upload (JPG/PNG/WebP, auto-compressed to ≤1024 px), mobile camera capture, staged scan progress, 150 s client timeout, one automatic retry on empty AI replies, friendly error messages, duplicate-submission guard. HEIC photos get a clear message instead of a silent failure.
- **Scan persistence** — the latest scan (ingredients, recipes, summary, thumbnail) and the last 5 scans are saved in versioned localStorage and restored on reload. Manual fridge items survive new scans; scanned items are refreshed.
- **Ingredient management** — add/edit/delete ingredients with quantity, category (Vegetables, Fruits, Dairy, Meat, Seafood, Grains, Spices, Beverages, Other), auto-categorization of scanned items, and an optional use-by date with an "expiring soon" badge.
- **Recipe generator** — AI recipes from your fridge contents, with filters (dietary, time, difficulty), search, favourites, and scan history with restore. AI recipes never show a misleading stock photo — they render a clean text-only card when no real dish photo exists.
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
