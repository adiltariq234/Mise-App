import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'MY_OPENROUTER_API_KEY') {
    throw new Error('OPENROUTER_API_KEY is not configured on the server.');
  }
  return apiKey;
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
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `OpenRouter request failed (${res.status}): ${body.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) {
    throw new Error('OpenRouter returned an empty reply.');
  }
  return JSON.parse(text) as unknown;
}

const VALID_DIETARY = new Set([
  'Vegetarian',
  'Vegan',
  'Keto',
  'Gluten-Free',
  'Dairy-Free',
  'High-Protein',
]);

function sanitizeRecipes(rawRecipes: unknown[]): unknown[] {
  return rawRecipes.map((rec, idx) => {
    const r = (rec || {}) as Record<string, unknown>;
    const rawDifficulty = String(r.difficulty || 'Easy');
    const difficulty =
      rawDifficulty === 'Medium' || rawDifficulty === 'Hard'
        ? rawDifficulty
        : 'Easy';
    const rawTags = Array.isArray(r.dietaryTags) ? r.dietaryTags : [];
    const dietaryTags = rawTags
      .map((t) => String(t))
      .filter((t) => VALID_DIETARY.has(t));

    return {
      id: String(r.id || `ai-recipe-${Date.now()}-${idx}`),
      title: String(r.title || 'Chef Skillet Creation'),
      description: String(r.description || ''),
      difficulty,
      prepTimeMinutes: Math.max(1, Number(r.prepTimeMinutes) || 10),
      cookTimeMinutes: Math.max(0, Number(r.cookTimeMinutes) || 10),
      calories: Math.max(80, Number(r.calories) || 380),
      servings: Math.max(1, Number(r.servings) || 2),
      dietaryTags,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      steps: Array.isArray(r.steps) ? r.steps : [],
    };
  });
}

const SYSTEM_INSTRUCTION =
  'You are Mise, an expert culinary assistant. Accurately identify ingredients from fridge photos and craft realistic, appetizing recipes with reliable calorie estimates, prep times, and hands-free step-by-step instructions. Only use these exact dietaryTags values: Vegetarian, Vegan, Keto, Gluten-Free, Dairy-Free, High-Protein.';

export async function createApp() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, model: MODEL_NAME, provider: 'openrouter' });
  });

  app.post('/api/analyze-fridge', async (req, res) => {
    try {
      const { imageBase64, mimeType, dietaryRestrictions } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        dietaryRestrictions?: string[];
      };

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'A fridge photo image is required.' });
        return;
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      const validMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
      const dietInstruction =
        Array.isArray(dietaryRestrictions) && dietaryRestrictions.length > 0
          ? `Prioritize recipes matching these active dietary preferences where possible, while still offering varied options: ${dietaryRestrictions.join(', ')}.`
          : 'Include a diverse mix of dietary styles (Vegetarian, Keto, High-Protein, Vegan, Gluten-Free, Dairy-Free).';

      const prompt = [
        'Inspect this open refrigerator photo carefully.',
        '1. List every distinct edible ingredient you can visibly identify.',
        '2. Suggest 5 practical, delicious recipes built primarily around these visible ingredients. Include at least 1-2 recipes that need 1-2 common missing essential items (marked inFridge: false, essential: true) so the user can add missing items to a shopping list if desired, alongside recipes ready to cook immediately.',
        '3. Write clear, scannable step-by-step instructions ideal for hands-free read-aloud cooking (include durationMinutes on active cooking/simmering/baking steps when applicable).',
        dietInstruction,
        JSON_SHAPE,
      ].join('\n');

      const parsed = (await callOpenRouter([
        { role: 'system', content: SYSTEM_INSTRUCTION },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${validMime};base64,${cleanBase64}` },
            },
            { type: 'text', text: prompt },
          ],
        },
      ])) as {
        detectedIngredients?: string[];
        summary?: string;
        recipes?: unknown[];
      };

      res.json({
        detectedIngredients: Array.isArray(parsed.detectedIngredients)
          ? parsed.detectedIngredients
          : [],
        summary: parsed.summary || 'Ingredients identified from your fridge photo.',
        recipes: sanitizeRecipes(Array.isArray(parsed.recipes) ? parsed.recipes : []),
      });
    } catch (err) {
      console.error('Error in /api/analyze-fridge:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to analyze fridge image.';
      const status = message.includes('OPENROUTER_API_KEY') ? 500 : 502;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/suggest-recipes', async (req, res) => {
    try {
      const { ingredients, dietaryRestrictions } = req.body as {
        ingredients?: string[];
        dietaryRestrictions?: string[];
      };

      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        res.status(400).json({ error: 'Provide at least one ingredient.' });
        return;
      }

      const dietInstruction =
        Array.isArray(dietaryRestrictions) && dietaryRestrictions.length > 0
          ? `Focus on recipes matching: ${dietaryRestrictions.join(', ')}.`
          : 'Offer a balanced variety across Vegetarian, Keto, High-Protein, and Gluten-Free options.';

      const prompt = [
        `Available fridge ingredients: ${ingredients.join(', ')}.`,
        dietInstruction,
        'Generate 5 distinct recipes using these ingredients, marking any missing essentials with inFridge: false.',
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

      res.json({
        detectedIngredients:
          Array.isArray(parsed.detectedIngredients) &&
          parsed.detectedIngredients.length > 0
            ? parsed.detectedIngredients
            : ingredients,
        summary: parsed.summary || 'Updated recipes based on your fridge inventory.',
        recipes: sanitizeRecipes(Array.isArray(parsed.recipes) ? parsed.recipes : []),
      });
    } catch (err) {
      console.error('Error in /api/suggest-recipes:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to generate recipe suggestions.';
      res.status(502).json({ error: message });
    }
  });

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
