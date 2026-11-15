# Mise — Operations Runbook

Last updated: 15 November 2026

## Live deployment

- **URL:** https://mise-app-olive.vercel.app/
- **Vercel project:** `mise-app`, team `adil-02b1` (Hobby plan)
- **GitHub repo:** `adiltariq234/Mise-App` (branch `main`; pushes auto-deploy)
- **AI provider:** OpenRouter (`nvidia/nemotron-3.5-super-vl:free`)

## Environment variables (Vercel → Project Settings → Environment Variables)

| Variable | Required | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Set for Production + Preview + Development. Free key from https://openrouter.ai/keys. **Never commit the value.** |
| `OPENROUTER_MODEL` | No | Defaults to `nvidia/nemotron-3.5-super-vl:free`. |
| `APP_URL` | No | Canonical app URL (used in the OpenRouter `HTTP-Referer` header). |
| `ALLOWED_ORIGINS` | No | Comma-separated extra origins allowed to call `/api/*` (CORS). Empty = same-origin only. |
| `RATE_LIMIT_SCANS_PER_HOUR` | No | Default 10. |
| `RATE_LIMIT_RECIPES_PER_HOUR` | No | Default 20. |
| `UPSTASH_REDIS_REST_URL` | No — recommended | Upstash Redis REST URL. Enables shared rate limiting + async AI jobs. |
| `UPSTASH_REDIS_REST_TOKEN` | No — recommended | Upstash Redis REST token. |

## Setting up Upstash Redis (optional, free tier)

1. Create an account at https://console.upstash.com and create a Redis
   database (Global or Regional — either works).
2. Copy the **REST URL** and **REST Token** from the database details page.
3. In Vercel → `mise-app` → Settings → Environment Variables, add
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for
   Production + Preview + Development.
4. Redeploy. Verify with `GET /api/health` — `rateLimit.mode` should be
   `"redis"` and `jobs.enabled` should be `true`.
5. Without these variables the app still works: rate limiting falls back
   to in-memory (per-instance, best-effort) and AI calls run
   synchronously.

## Rotating the OpenRouter key

1. Create a new key at https://openrouter.ai/keys.
2. In Vercel → `mise-app` → Settings → Environment Variables, update
   `OPENROUTER_API_KEY` (all three environments).
3. Redeploy the project (Deployments → ⋯ → Redeploy).
4. Verify `GET /api/health` returns `{"ok":true}` and run one test scan.
5. Revoke the old key in OpenRouter.

## Rolling back a deployment

1. Vercel → `mise-app` → Deployments.
2. Find the last known-good deployment → ⋯ → **Promote to Production**
   (or **Redeploy** on an older commit).
3. Verify the homepage and `/api/health` load.

## If the AI stops working

1. Check `GET /api/health` — if `ok` is true, the server is up.
2. Check Vercel → `mise-app` → Logs for `OpenRouter` errors (only the
   status is logged; provider bodies are not forwarded to clients).
3. Common causes:
   - **Key missing/rotated** — `OPENROUTER_API_KEY is not configured`
     in logs → follow "Rotating the OpenRouter key".
   - **Upstream 429** — free-tier quota exhausted; wait, or switch
     `OPENROUTER_MODEL` to another free vision model and redeploy.
   - **Empty/truncated replies** — the model burned its token budget on
     reasoning; the server retries once automatically. If it persists,
     lower `max_tokens` is *not* the fix — switch models.
4. If scans fail with `AI_TIMEOUT` frequently, the model is slow; the
   async-job path (Upstash Redis) removes the synchronous wait.

## Rate limiting

- Defaults: 10 scans/hour/IP, 20 recipe generations/hour/IP.
- A blocked client gets HTTP 429 with `Retry-After` (seconds) and a
  friendly message. Limits are per IP; a shared NAT (school, office)
  shares one quota.
- To raise limits, change the two `RATE_LIMIT_*` env vars and redeploy.

## Backups

- **Code:** GitHub (`adiltariq234/Mise-App`) — the source of truth.
- **Config:** Vercel env vars — no automated backup; keep a private
  note of which variables exist (values never in the repo).
- **User data:** stored only in each user's browser localStorage; there
  is no server-side user data to back up.

## Support

There is no in-app support channel yet (P1-15 in the QA audit). Users
reach the operator through the channels published on the operator's
own site. Error states in the app link to the Privacy Policy / Terms.
