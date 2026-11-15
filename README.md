# Mise — Smart Fridge & Culinary Assistant

Snap a photo of your open fridge to identify ingredients, filter recipes by diet, cook hands-free with read-aloud steps, and add missing essentials to a shopping list.

AI runs on **OpenRouter** (free vision model `nvidia/nemotron-3.5-super-vl:free` by default) — no Gemini key needed.

## Run Locally

**Prerequisites:** Node.js (or Bun)

1. Install dependencies:
   `bun install` (or `npm install`)
2. Set `OPENROUTER_API_KEY` in `.env.local` — create a free key at https://openrouter.ai/keys
3. Run the app:
   `npm run dev` (or `bun run dev`)

The server listens on port 3000. `/api/health` reports the active model.
