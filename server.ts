import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';
import { waitUntil } from '@vercel/functions';
import {
  MAX_IMAGE_BYTES,
  detectImageMime,
  estimateBase64Bytes,
  isAllowedImageMime,
} from './src/utils/imageValidation.ts';
import type { Recipe } from './src/types/culinary.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
// Free OpenRouter vision model (verified 2026-11-15: text+image input,
// response_format + structured_outputs supported, $0 prompt/completion).
// Override with OPENROUTER_MODEL to use any other OpenRouter model id.
const MODEL_NAME =
  process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-super-vl:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ---------------------------------------------------------------------------
// Configuration (env-driven, documented in .env.example / docs/runbook.md)
// ---------------------------------------------------------------------------
const SCANS_PER_HOUR = Number(process.env.RATE_LIMIT_SCANS_PER_HOUR || 10);
const RECIPES_PER_HOUR = Number(process.env.RATE_LIMIT_RECIPES_PER_HOUR || 20);
const RATE_LIMIT_WINDOW_S = 3600;
const JOB_TTL_S = 1800; // job results kept 30 minutes
const OPENROUTER_TIMEOUT_MS = 120_000;
const MAX_INGREDIENTS = 50;
const MAX_DIETARY_TAGS = 10;

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'MY_OPENROUTER_API_KEY') {
    throw new Error('OPENROUTER_API_KEY is not configured on the server.');
  }
  return apiKey;
}

// ---------------------------------------------------------------------------
// Optional Redis (Upstash). When UPSTASH_REDIS_REST_URL + TOKEN are set,
// rate limiting is shared across serverless instances and long AI jobs
// run asynchronously with status polling. When they are absent the app
// still works: rate limiting falls back to a best-effort in-memory
// window and AI calls run synchronously (verified: 71–84 s live).
// ---------------------------------------------------------------------------
let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch (err) {
    console.error('Failed to create Upstash Redis client:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rate limiting — fixed window per client IP, Redis-backed when available.
// ---------------------------------------------------------------------------
type RateLimitResult = { allowed: boolean; remaining: number; resetIn: number };

const memoryWindows = new Map<string, { count: number; resetAt: number }>();

async function checkRateLimit(
  key: string,
  limit: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now();
  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, RATE_LIMIT_WINDOW_S);
      }
      const ttl = await redis.ttl(key);
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetIn: ttl > 0 ? ttl : RATE_LIMIT_WINDOW_S,
      };
    } catch (err) {
      console.error('Redis rate-limit check failed, falling back to memory:', err);
    }
  }
  const entry = memoryWindows.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryWindows.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_S * 1000 });
    return { allowed: true, remaining: limit - 1, resetIn: RATE_LIMIT_WINDOW_S };
  }
  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  };
}

function rateLimitMiddleware(limit: number, kind: 'scan' | 'recipes') {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const ip = req.ip || 'unknown';
    const key = `mise:rl:${kind}:${ip}`;
    const result = await checkRateLimit(key, limit);
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.resetIn));
      res.status(429).json({
        error:
          'Too many requests. Please wait a few minutes and try again.',
        code: 'RATE_LIMITED',
      });
      return;
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// Async jobs — created when Redis is available; the AI work runs in
// waitUntil() after the 202 response so the client is not holding a
// 60–120 s connection open. The client polls GET /api/jobs/:id.
// ---------------------------------------------------------------------------
type JobStatus = 'processing' | 'complete' | 'failed';
interface JobRecord {
  status: JobStatus;
  createdAt: number;
  result?: unknown;
  error?: string;
  code?: string;
}

async function setJob(jobId: string, record: JobRecord): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`mise:job:${jobId}`, JSON.stringify(record), { ex: JOB_TTL_S });
}

async function getJob(jobId: string): Promise<JobRecord | null> {
  const redis = getRedis();
  if (!redis) return null;
  // NOTE (2026-11-16): @upstash/redis auto-deserializes GET responses — a
  // stored JSON string comes back as an OBJECT, not a string. The old code
  // called JSON.parse() on that object, which threw, so every poll returned
  // JOB_NOT_FOUND even though the job was stored fine (the 202 worked).
  // Accept both shapes.
  const raw = await redis.get<string | JobRecord>(`mise:job:${jobId}`);
  if (!raw) return null;
  if (typeof raw === 'object') return raw as JobRecord;
  try {
    return JSON.parse(raw) as JobRecord;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Errors — stable machine codes; the raw provider body is NEVER forwarded.
// ---------------------------------------------------------------------------
class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const JSON_SHAPE = `Return ONLY valid JSON (no markdown, no extra text) with this exact shape:
{
  "detectedIngredients": ["ingredient name", ...],
  "summary": "one sentence",
  "recipes": [
    {
      "id": "unique-id",
      "title": "Recipe title",
      "description": "short description",
      "difficulty": "Easy | Medium | Hard",
      "prepTimeMinutes": 10,
      "cookTimeMinutes": 15,
      "calories": 380,
      "servings": 2,
      "dietaryTags": ["Vegetarian" | "Vegan" | "Keto" | "Gluten-Free" | "Dairy-Free" | "High-Protein"],
      "ingredients": [{"name": "...", "amount": "...", "essential": true, "inFridge": true}],
      "steps": [{"stepNumber": 1, "instruction": "...", "tip": "...", "durationMinutes": 5}]
    }
  ]
}`;

type ChatMessage = {
  role: 'system' | 'user';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
};

async function callOpenRouter(messages: ChatMessage[]): Promise<unknown> {
  const apiKey = getApiKey();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'Mise',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages,
          response_format: { type: 'json_object' },
          max_tokens: 16000,
          temperature: 0.7,
          // Nemotron reasons heavily and can burn the whole token budget on
          // thinking, leaving nothing for the JSON output (empty/truncated
          // replies seen live). Low effort keeps the reasoning short.
          reasoning: { effort: 'low' },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Log the provider detail server-side only; the client gets a code.
        const body = await res.text().catch(() => '');
        console.error(`OpenRouter ${res.status}:`, body.slice(0, 500));
        if (res.status === 429) {
          throw new ApiError(502, 'AI_BUSY', 'The AI service is busy right now.');
        }
        throw new ApiError(502, 'AI_UNAVAILABLE', 'The AI service is temporarily unavailable.');
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? '';
      if (!text.trim()) {
        throw new ApiError(502, 'AI_EMPTY', 'The AI returned an empty reply.');
      }
      return parseModelJson(text);
    } catch (err) {
      if (err instanceof ApiError) {
        // Empty/parse failures are worth one retry; quota/5xx are not.
        if (err.code === 'AI_EMPTY' && attempt === 0) {
          lastError = err;
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw err;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError(504, 'AI_TIMEOUT', 'The AI took too long to respond.');
      }
      console.error('OpenRouter call failed:', err);
      throw new ApiError(502, 'AI_UNAVAILABLE', 'The AI service is temporarily unavailable.');
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new ApiError(502, 'AI_UNAVAILABLE', 'The AI service is temporarily unavailable.');
}

/** Parse the model's JSON; tolerate a little trailing text by extracting
 * the outermost { ... } block once before giving up. */
function parseModelJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as unknown;
      } catch {
        // fall through
      }
    }
    throw new ApiError(502, 'AI_EMPTY', 'The AI returned a response that could not be read.');
  }
}

const VALID_DIETARY = new Set([
  'Vegetarian',
  'Vegan',
  'Keto',
  'Gluten-Free',
  'Dairy-Free',
  'High-Protein',
]);

function asClampedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function asCappedString(value: unknown, fallback: string, maxLen: number): string {
  if (typeof value !== 'string') return fallback;
  const t = value.trim();
  return t.length > 0 ? t.slice(0, maxLen) : fallback;
}

/**
 * Deep-validate AI-generated recipes. The model is not trusted: every
 * field is coerced or dropped, steps/ingredients must have the shape the
 * UI renders, and duplicate ids are made unique (React key collisions).
 */
export function sanitizeRecipes(rawRecipes: unknown[]): Recipe[] {
  const seenIds = new Set<string>();
  return rawRecipes
    .map((rec, idx) => {
      const r = (rec || {}) as Record<string, unknown>;
      const rawDifficulty = String(r.difficulty || 'Easy');
      const difficulty =
        rawDifficulty === 'Medium' || rawDifficulty === 'Hard'
          ? rawDifficulty
          : 'Easy';
      const rawTags = Array.isArray(r.dietaryTags) ? r.dietaryTags : [];
      const dietaryTags = rawTags
        .map((t) => String(t))
        .filter((t) => VALID_DIETARY.has(t)) as Recipe['dietaryTags'];

      let baseId = asCappedString(r.id, `ai-recipe-${Date.now()}-${idx}`, 80)
        .replace(/[^a-zA-Z0-9-_]/g, '-');
      let id = baseId;
      let suffix = 2;
      while (seenIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      seenIds.add(id);

      const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : [])
        .map((ing) => {
          const item = (ing || {}) as Record<string, unknown>;
          const name = asCappedString(item.name, '', 120);
          if (!name) return null;
          return {
            name,
            amount: asCappedString(item.amount, '1 unit', 80),
            essential: item.essential === true,
            inFridge: item.inFridge === true,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .slice(0, 30);

      const steps = (Array.isArray(r.steps) ? r.steps : [])
        .map((s, sIdx) => {
          const step = (s || {}) as Record<string, unknown>;
          const instruction = asCappedString(step.instruction, '', 1000);
          if (!instruction) return null;
          return {
            stepNumber: asClampedNumber(step.stepNumber, sIdx + 1, 1, 100),
            instruction,
            tip:
              typeof step.tip === 'string' && step.tip.trim()
                ? step.tip.trim().slice(0, 500)
                : undefined,
            durationMinutes:
              step.durationMinutes === undefined || step.durationMinutes === null
                ? undefined
                : asClampedNumber(step.durationMinutes, 0, 0, 600),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .slice(0, 40);

      return {
        id,
        title: asCappedString(r.title, 'Chef Skillet Creation', 200),
        description: asCappedString(r.description, '', 1000),
        difficulty,
        prepTimeMinutes: asClampedNumber(r.prepTimeMinutes, 10, 1, 600),
        cookTimeMinutes: asClampedNumber(r.cookTimeMinutes, 10, 0, 600),
        calories: asClampedNumber(r.calories, 380, 80, 5000),
        servings: asClampedNumber(r.servings, 2, 1, 20),
        dietaryTags,
        isAiGenerated: true,
        ingredients,
        steps,
      } as Recipe;
    })
    .filter((r) => r.title.length > 0);
}

function sanitizeDetectedIngredients(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((i) => (typeof i === 'string' ? i.trim() : ''))
    .filter((i) => i.length > 0 && i.length <= 80)
    .slice(0, 60);
}

function sanitizeDietaryRestrictions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter((t) => VALID_DIETARY.has(t))
    .slice(0, MAX_DIETARY_TAGS);
}

/** Only 'ur' passes through — anything else (including garbage) is English. */
function sanitizeLang(raw: unknown): 'en' | 'ur' {
  return raw === 'ur' ? 'ur' : 'en';
}

function sanitizeIngredientNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((i) => (typeof i === 'string' ? i.trim() : ''))
    .filter((i) => i.length > 0 && i.length <= 80)
    .slice(0, MAX_INGREDIENTS);
}

/**
 * Validate an uploaded image: strip a data-URL prefix, check the decoded
 * size, and verify the format from magic bytes (the client-supplied MIME
 * is never trusted). Returns the clean base64 + verified MIME.
 */
export function validateImageInput(input: unknown, mimeHint: unknown): { base64: string; mime: string } {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new ApiError(400, 'VALIDATION', 'A fridge photo image is required.');
  }
  const cleanBase64 = input.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();
  if (!/^[A-Za-z0-9+/=_-]+$/.test(cleanBase64)) {
    throw new ApiError(400, 'VALIDATION', 'The uploaded photo could not be read.');
  }
  const estimatedBytes = estimateBase64Bytes(cleanBase64);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    throw new ApiError(
      400,
      'VALIDATION',
      'That photo is too large. Please use a photo under 8 MB.',
    );
  }
  let bytes: Buffer;
  try {
    bytes = Buffer.from(cleanBase64, 'base64');
  } catch {
    throw new ApiError(400, 'VALIDATION', 'The uploaded photo could not be read.');
  }
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    throw new ApiError(400, 'VALIDATION', 'The uploaded photo could not be read.');
  }
  const detected = detectImageMime(bytes);
  if (!detected) {
    throw new ApiError(
      400,
      'VALIDATION',
      'Only JPG, PNG, and WebP photos are supported. HEIC photos from iPhone need to be exported as JPG first.',
    );
  }
  const hint = typeof mimeHint === 'string' ? mimeHint : '';
  if (hint && isAllowedImageMime(hint) && hint !== detected) {
    // MIME hint disagrees with the actual bytes — trust the bytes.
  }
  return { base64: cleanBase64, mime: detected };
}

const SYSTEM_INSTRUCTION =
  'You are Mise, an expert culinary assistant. Accurately identify ingredients from fridge photos and craft realistic, appetizing recipes with reliable calorie estimates, prep times, and hands-free step-by-step instructions. Only use these exact dietaryTags values: Vegetarian, Vegan, Keto, Gluten-Free, Dairy-Free, High-Protein.';

/**
 * Added to the recipe prompt when the UI language is Urdu. The recipe
 * text itself must be Urdu (so read-aloud can speak it), but the parts
 * the app parses stay machine-readable: Western digits 0-9 for every
 * number (the serving-size parser only reads ASCII digits, and Urdu-Indic
 * digits ۰-۹ would silently make amounts unscalable), quantities written
 * as numerals never words, JSON field names / difficulty / dietaryTags in
 * English, and detectedIngredients in English (they are the data matched
 * against the fridge inventory).
 */
const URDU_RECIPE_INSTRUCTION =
  'Write the ENTIRE recipe in Urdu (title, description, summary, ingredient names inside each recipe, steps, and tips). ' +
  'Use Western Arabic numerals 0-9 for ALL numbers (amounts, times, calories, servings, step numbers) — never use Urdu-Indic digits (۰-۹). ' +
  'Write all quantities as numerals (2, 1.5, 1/2), never as words. ' +
  'Keep the JSON field names, the difficulty values (Easy/Medium/Hard), the dietaryTags values, and the recipe "id" exactly as specified in English. ' +
  'Keep detectedIngredients in English.';

async function runFridgeAnalysis(input: {
  imageBase64?: string;
  mimeType?: string;
  dietaryRestrictions?: string[];
  lang?: string;
}) {
  const { base64, mime } = validateImageInput(input.imageBase64, input.mimeType);
  const dietary = sanitizeDietaryRestrictions(input.dietaryRestrictions);
  const lang = sanitizeLang(input.lang);
  const dietInstruction =
    dietary.length > 0
      ? `Prioritize recipes matching these active dietary preferences where possible, while still offering varied options: ${dietary.join(', ')}.`
      : 'Include a diverse mix of dietary styles (Vegetarian, Keto, High-Protein, Vegan, Gluten-Free, Dairy-Free).';

  const prompt = [
    'Inspect this open refrigerator photo carefully.',
    '1. List every distinct edible ingredient you can visibly identify.',
    '2. Suggest 5 practical, delicious recipes built primarily around these visible ingredients. Include at least 1-2 recipes that need 1-2 common missing essential items (marked inFridge: false, essential: true) so the user can add missing items to a shopping list if desired, alongside recipes ready to cook immediately.',
    '3. Write clear, scannable step-by-step instructions ideal for hands-free read-aloud cooking (include durationMinutes on active cooking/simmering/baking steps when applicable).',
    dietInstruction,
    ...(lang === 'ur' ? [URDU_RECIPE_INSTRUCTION] : []),
    JSON_SHAPE,
  ].join('\n');

  const parsed = (await callOpenRouter([
    { role: 'system', content: SYSTEM_INSTRUCTION },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
        { type: 'text', text: prompt },
      ],
    },
  ])) as {
    detectedIngredients?: string[];
    summary?: string;
    recipes?: unknown[];
  };

  return {
    detectedIngredients: sanitizeDetectedIngredients(parsed.detectedIngredients),
    summary:
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 500)
        : lang === 'ur'
          ? 'آپ کے فریج کی تصویر سے اجزاء کی شناخت ہو گئی۔'
          : 'Ingredients identified from your fridge photo.',
    recipes: sanitizeRecipes(Array.isArray(parsed.recipes) ? parsed.recipes : []),
  };
}

async function runRecipeSuggestions(input: {
  ingredients?: string[];
  dietaryRestrictions?: string[];
  lang?: string;
}) {
  const ingredients = sanitizeIngredientNames(input.ingredients);
  if (ingredients.length === 0) {
    throw new ApiError(400, 'VALIDATION', 'Provide at least one ingredient.');
  }
  const dietary = sanitizeDietaryRestrictions(input.dietaryRestrictions);
  const lang = sanitizeLang(input.lang);
  const dietInstruction =
    dietary.length > 0
      ? `Focus on recipes matching: ${dietary.join(', ')}.`
      : 'Offer a balanced variety across Vegetarian, Keto, High-Protein, and Gluten-Free options.';

  const prompt = [
    `Available fridge ingredients: ${ingredients.join(', ')}.`,
    dietInstruction,
    'Generate 5 distinct recipes using these ingredients, marking any missing essentials with inFridge: false.',
    ...(lang === 'ur' ? [URDU_RECIPE_INSTRUCTION] : []),
    JSON_SHAPE,
  ].join('\n');

  const parsed = (await callOpenRouter([
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user', content: prompt },
  ])) as {
    detectedIngredients?: string[];
    summary?: string;
    recipes?: unknown[];
  };

  const detected = sanitizeDetectedIngredients(parsed.detectedIngredients);
  return {
    detectedIngredients: detected.length > 0 ? detected : ingredients,
    summary:
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 500)
        : lang === 'ur'
          ? 'آپ کے فریج کے اجزاء کی بنیاد پر تراکیب تازہ کر دی گئیں۔'
          : 'Updated recipes based on your fridge inventory.',
    recipes: sanitizeRecipes(Array.isArray(parsed.recipes) ? parsed.recipes : []),
  };
}

/** Run a job in the background and store its outcome (Redis only). */
async function processJob(
  jobId: string,
  kind: 'analyze' | 'suggest',
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const result =
      kind === 'analyze'
        ? await runFridgeAnalysis(payload as never)
        : await runRecipeSuggestions(payload as never);
    await setJob(jobId, { status: 'complete', createdAt: Date.now(), result });
  } catch (err) {
    const apiErr = err instanceof ApiError ? err : null;
    await setJob(jobId, {
      status: 'failed',
      createdAt: Date.now(),
      error: apiErr?.message || 'The AI service is temporarily unavailable.',
      code: apiErr?.code || 'AI_UNAVAILABLE',
    });
  }
}

function handleRouteError(err: unknown, res: express.Response): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  console.error('Unhandled API error:', err);
  res.status(500).json({
    error: 'Something went wrong on our side. Please try again.',
    code: 'SERVER_ERROR',
  });
}

export async function createApp() {
  const app = express();
  // Trust the first proxy (Vercel) so req.ip is the real client IP —
  // required for per-IP rate limiting to mean anything.
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '15mb' }));

  // CORS: same-origin by default. Extra origins only from ALLOWED_ORIGINS.
  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  );
  app.use('/api', (req, res, next) => {
    // Basic API security headers (the full CSP lives in vercel.json).
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      if (origin && allowedOrigins.has(origin)) {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
      }
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      model: MODEL_NAME,
      provider: 'openrouter',
      rateLimit: {
        mode: getRedis() ? 'redis' : 'memory',
        scansPerHour: SCANS_PER_HOUR,
        recipesPerHour: RECIPES_PER_HOUR,
      },
      jobs: { enabled: getRedis() !== null },
    });
  });

  app.get('/api/jobs/:id', async (req, res) => {
    const job = await getJob(req.params.id);
    if (!job) {
      res.status(404).json({
        error: 'That job was not found or has expired. Please start a new scan.',
        code: 'JOB_NOT_FOUND',
      });
      return;
    }
    res.json(job);
  });

  app.post(
    '/api/analyze-fridge',
    rateLimitMiddleware(SCANS_PER_HOUR, 'scan'),
    async (req, res) => {
      try {
        const body = (req.body || {}) as {
          imageBase64?: string;
          mimeType?: string;
          dietaryRestrictions?: string[];
          lang?: string;
        };
        // Validate synchronously so bad input gets an immediate 400
        // instead of a job that fails later.
        validateImageInput(body.imageBase64, body.mimeType);
        if (getRedis()) {
          const jobId = crypto.randomUUID();
          await setJob(jobId, { status: 'processing', createdAt: Date.now() });
          waitUntil(processJob(jobId, 'analyze', body));
          res.status(202).json({ jobId, status: 'processing' });
          return;
        }
        const result = await runFridgeAnalysis(body);
        res.json(result);
      } catch (err) {
        handleRouteError(err, res);
      }
    },
  );

  app.post(
    '/api/suggest-recipes',
    rateLimitMiddleware(RECIPES_PER_HOUR, 'recipes'),
    async (req, res) => {
      try {
        const body = (req.body || {}) as {
          ingredients?: string[];
          dietaryRestrictions?: string[];
          lang?: string;
        };
        // Validate synchronously so an empty list gets an immediate 400.
        if (sanitizeIngredientNames(body.ingredients).length === 0) {
          throw new ApiError(400, 'VALIDATION', 'Provide at least one ingredient.');
        }
        if (getRedis()) {
          const jobId = crypto.randomUUID();
          await setJob(jobId, { status: 'processing', createdAt: Date.now() });
          waitUntil(processJob(jobId, 'suggest', body));
          res.status(202).json({ jobId, status: 'processing' });
          return;
        }
        const result = await runRecipeSuggestions(body);
        res.json(result);
      } catch (err) {
        handleRouteError(err, res);
      }
    },
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.VERCEL !== '1') {
    // On Vercel, static files are served by Vercel itself; the serverless
    // function (api/index.ts) only handles /api/* routes.
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

async function startServer() {
  const app = await createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mise server listening on http://0.0.0.0:${PORT}`);
  });
}

// On Vercel the Express app runs as a serverless function (api/index.ts);
// only auto-start a long-lived listener when running locally.
if (process.env.VERCEL !== '1') {
  startServer();
}
