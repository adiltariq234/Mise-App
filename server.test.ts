import test from 'node:test';
import assert from 'node:assert/strict';

// Env must be set BEFORE importing server.ts (its module top-level only
// auto-starts a listener when VERCEL !== '1', and createApp() only loads
// Vite when NODE_ENV !== 'production').
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';
delete process.env.OPENROUTER_API_KEY;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const { createApp, sanitizeRecipes, validateImageInput } = await import(
  './server.ts'
);

async function startTestServer() {
  const app = await createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { server, base: `http://127.0.0.1:${port}` };
}

async function postJson(base: string, path: string, body: unknown) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // non-JSON body
  }
  return { res, json, text };
}

test('GET /api/health reports ok, model, and rate-limit mode', async () => {
  const { server, base } = await startTestServer();
  try {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      ok: boolean;
      model: string;
      provider: string;
      rateLimit: { mode: string; scansPerHour: number };
      jobs: { enabled: boolean };
    };
    assert.equal(body.ok, true);
    assert.equal(body.provider, 'openrouter');
    assert.equal(body.rateLimit.mode, 'memory'); // no Redis configured
    assert.equal(body.jobs.enabled, false);
  } finally {
    server.close();
  }
});

test('POST /api/analyze-fridge with an empty body returns 400 VALIDATION', async () => {
  const { server, base } = await startTestServer();
  try {
    const { res, json } = await postJson(base, '/api/analyze-fridge', {});
    assert.equal(res.status, 400);
    assert.equal(json.code, 'VALIDATION');
    assert.ok(typeof json.error === 'string' && json.error.length > 0);
    // Rate-limit headers are present even on validation failures.
    assert.ok(res.headers.get('x-ratelimit-limit'));
    assert.ok(res.headers.get('x-ratelimit-remaining') !== null);
  } finally {
    server.close();
  }
});

test('POST /api/analyze-fridge with garbage base64 returns 400, not a 502 leak', async () => {
  const { server, base } = await startTestServer();
  try {
    const { res, json } = await postJson(base, '/api/analyze-fridge', {
      imageBase64: Buffer.from('this is not an image at all').toString('base64'),
      mimeType: 'image/jpeg',
    });
    assert.equal(res.status, 400);
    assert.equal(json.code, 'VALIDATION');
    // The raw provider error must never reach the client.
    assert.ok(!String(json.error).includes('user_id'));
  } finally {
    server.close();
  }
});

test('POST /api/suggest-recipes with no ingredients returns 400 VALIDATION', async () => {
  const { server, base } = await startTestServer();
  try {
    const { res, json } = await postJson(base, '/api/suggest-recipes', { ingredients: [] });
    assert.equal(res.status, 400);
    assert.equal(json.code, 'VALIDATION');
    const { res: res2 } = await postJson(base, '/api/suggest-recipes', {});
    assert.equal(res2.status, 400);
  } finally {
    server.close();
  }
});

test('GET /api/jobs/:id for an unknown job returns 404 JOB_NOT_FOUND', async () => {
  const { server, base } = await startTestServer();
  try {
    const res = await fetch(`${base}/api/jobs/does-not-exist`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, 'JOB_NOT_FOUND');
  } finally {
    server.close();
  }
});

test('validateImageInput accepts real JPEG bytes and rejects garbage', () => {
  const jpegBase64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]).toString('base64');
  const ok = validateImageInput(jpegBase64, 'image/jpeg');
  assert.equal(ok.mime, 'image/jpeg');

  assert.throws(
    () => validateImageInput(Buffer.from('hello world').toString('base64'), 'image/jpeg'),
    (e: unknown) => (e as { code?: string }).code === 'VALIDATION',
  );
  assert.throws(
    () => validateImageInput('', 'image/jpeg'),
    (e: unknown) => (e as { code?: string }).code === 'VALIDATION',
  );
});

test('sanitizeRecipes deep-validates AI output and dedupes ids', () => {
  const out = sanitizeRecipes([
    {
      id: 'r1',
      title: 'Test Soup',
      description: 'Warm and simple.',
      difficulty: 'Medium',
      prepTimeMinutes: 5,
      cookTimeMinutes: 10,
      calories: 300,
      servings: 2,
      dietaryTags: ['Vegan', 'NotARealTag'],
      ingredients: [
        { name: 'Carrots', amount: '2', essential: true, inFridge: true },
        { name: '', amount: 'x', essential: true, inFridge: false },
        { name: 'Salt', amount: '1 tsp', essential: false, inFridge: false },
      ],
      steps: [
        { stepNumber: 1, instruction: 'Chop the carrots.', durationMinutes: 5 },
        { stepNumber: 2, instruction: '', durationMinutes: 1 },
        { stepNumber: 3, instruction: 'Simmer.', tip: 'Low heat.' },
      ],
    },
    { id: 'r1', title: 'Duplicate Id Dish', ingredients: [], steps: [] },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].title, 'Test Soup');
  assert.deepEqual(out[0].dietaryTags, ['Vegan']);
  assert.equal(out[0].ingredients.length, 2); // empty-name ingredient dropped
  assert.equal(out[0].steps.length, 2); // empty-instruction step dropped
  assert.equal(out[0].isAiGenerated, true);
  assert.notEqual(out[0].id, out[1].id); // duplicate id made unique
  assert.equal(out[1].difficulty, 'Easy');
});

/**
 * Start a test server, capture the exact request it sends to OpenRouter,
 * and answer with a canned valid reply. Non-OpenRouter fetches (the
 * test client itself) pass through to the real fetch.
 */
async function withCapturedOpenRouter(
  body: unknown,
  run: (captured: Array<Record<string, unknown>>) => Promise<void>,
) {
  const { server, base } = await startTestServer();
  const originalFetch = globalThis.fetch;
  // callOpenRouter reads the key before fetching — give it a dummy so
  // the request reaches the stub (the key is never sent anywhere real).
  const hadKey = 'OPENROUTER_API_KEY' in process.env;
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'test-dummy-key';
  const captured: Array<Record<string, unknown>> = [];
  globalThis.fetch = (async (url: unknown, init?: { body?: unknown }) => {
    if (typeof url === 'string' && url.includes('openrouter.ai')) {
      captured.push(JSON.parse(String((init as { body?: string }).body ?? '{}')));
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  detectedIngredients: ['Chicken'],
                  summary: 'Canned summary.',
                  recipes: [],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return originalFetch(url as string, init as never);
  }) as typeof fetch;
  try {
    const { res } = await postJson(base, '/api/suggest-recipes', body);
    assert.equal(res.status, 200);
    await run(captured);
  } finally {
    globalThis.fetch = originalFetch;
    if (hadKey) process.env.OPENROUTER_API_KEY = prevKey;
    else delete process.env.OPENROUTER_API_KEY;
    server.close();
  }
}

function openRouterPromptText(captured: Array<Record<string, unknown>>): string {
  assert.equal(captured.length, 1);
  const messages = captured[0].messages as Array<{ content: unknown }>;
  return messages
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join('\n');
}

test('POST /api/suggest-recipes with lang ur asks for Urdu recipes with Western digits', async () => {
  await withCapturedOpenRouter({ ingredients: ['Chicken'], lang: 'ur' }, async (captured) => {
    const prompt = openRouterPromptText(captured);
    assert.match(prompt, /ENTIRE recipe in Urdu/);
    assert.match(prompt, /Western Arabic numerals 0-9/);
    assert.match(prompt, /never use Urdu-Indic digits/);
    assert.match(prompt, /Keep detectedIngredients in English/);
  });
});

test('POST /api/suggest-recipes without lang sends no Urdu instruction', async () => {
  await withCapturedOpenRouter({ ingredients: ['Chicken'] }, async (captured) => {
    const prompt = openRouterPromptText(captured);
    assert.doesNotMatch(prompt, /Urdu/);
  });
});

test('GET /api/auth/me without a token returns 401 UNAUTHENTICATED', async () => {
  const { server, base } = await startTestServer();
  try {
    const res = await fetch(`${base}/api/auth/me`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, 'UNAUTHENTICATED');
  } finally {
    server.close();
  }
});

test('GET /api/auth/me with an invalid token returns 401, not a 500', async () => {
  const { server, base } = await startTestServer();
  try {
    // No Supabase admin client is configured in the test env, so any
    // token must fail closed as unauthenticated.
    const res = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, 'UNAUTHENTICATED');
  } finally {
    server.close();
  }
});

test('GET /api/health reports whether auth is configured', async () => {
  const { server, base } = await startTestServer();
  try {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { auth?: { configured?: boolean } };
    // No Supabase env vars in the test env: configured must be false.
    assert.equal(body.auth?.configured, false);
  } finally {
    server.close();
  }
});
