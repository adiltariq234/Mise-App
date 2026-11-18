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

const {
  createApp,
  fixDietaryTags,
  isAdminEmail,
  listAdminUsers,
  sanitizeRecipes,
  setUserPro,
  validateImageInput,
} = await import('./server.ts');

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

test('sanitizeRecipes drops dietary tags contradicted by the recipe ingredients', () => {
  const out = sanitizeRecipes([
    {
      id: 'yogurt-bowl',
      title: 'Yogurt Bowl',
      dietaryTags: ['Dairy-Free', 'Vegetarian', 'Gluten-Free'],
      ingredients: [
        { name: 'Greek Yogurt', amount: '200 g', essential: true, inFridge: true },
        { name: 'Honey', amount: '1 tbsp', essential: false, inFridge: true },
      ],
      steps: [{ stepNumber: 1, instruction: 'Mix.' }],
    },
    {
      id: 'coconut-curry',
      title: 'Coconut Curry',
      dietaryTags: ['Dairy-Free', 'Vegan', 'Gluten-Free'],
      ingredients: [
        { name: 'Coconut Milk', amount: '1 can', essential: true, inFridge: true },
        { name: 'Chickpeas', amount: '1 can', essential: true, inFridge: true },
      ],
      steps: [{ stepNumber: 1, instruction: 'Simmer.' }],
    },
    {
      id: 'chicken-rice',
      title: 'Chicken Rice',
      dietaryTags: ['Vegan', 'Vegetarian', 'Keto', 'Gluten-Free'],
      ingredients: [
        { name: 'Chicken Breast', amount: '200 g', essential: true, inFridge: true },
        { name: 'Rice', amount: '1 cup', essential: true, inFridge: true },
      ],
      steps: [{ stepNumber: 1, instruction: 'Cook.' }],
    },
  ]);
  // Yogurt contradicts Dairy-Free (the Nov 2026 bug); honey does not
  // contradict Vegetarian or Gluten-Free, so those stay.
  assert.deepEqual(out[0].dietaryTags, ['Vegetarian', 'Gluten-Free']);
  // "Coconut Milk" is not dairy and chickpeas are vegan — all tags stay.
  assert.deepEqual(out[1].dietaryTags, ['Dairy-Free', 'Vegan', 'Gluten-Free']);
  // Chicken kills Vegan + Vegetarian; rice kills Keto; rice is gluten-free.
  assert.deepEqual(out[2].dietaryTags, ['Gluten-Free']);
});

test('fixDietaryTags keeps Dairy-Free for almond milk and peanut butter', () => {
  assert.deepEqual(
    fixDietaryTags(['Dairy-Free', 'Vegan'], ['Almond Milk', 'Peanut Butter', 'Oats']),
    ['Dairy-Free', 'Vegan'],
  );
  assert.deepEqual(fixDietaryTags(['Dairy-Free'], ['Butter']), []);
  assert.deepEqual(fixDietaryTags(['Keto'], ['Almond Flour', 'Eggs']), ['Keto']);
  assert.deepEqual(fixDietaryTags(['Gluten-Free'], ['Wheat Flour']), []);
});

test('sanitizeRecipes keeps the English ingredient name (nameEn) when present', () => {
  const out = sanitizeRecipes([
    {
      id: 'urdu-dish',
      title: 'ٹماٹر کا سالن',
      ingredients: [
        { name: 'ٹماٹر', nameEn: 'tomato', amount: '2', essential: true, inFridge: true },
        { name: 'پیاز', amount: '1', essential: true, inFridge: true },
      ],
      steps: [{ stepNumber: 1, instruction: 'پکائیں۔' }],
    },
  ]);
  assert.equal(out[0].ingredients[0].nameEn, 'tomato');
  assert.equal(out[0].ingredients[1].nameEn, undefined);
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

test('POST /api/suggest-recipes refresh asks for 3 compact recipes with the tag rule', async () => {
  await withCapturedOpenRouter({ ingredients: ['Chicken', 'Rice'] }, async (captured) => {
    const prompt = openRouterPromptText(captured);
    // The lighter refresh call (Nov 2026): 3 recipes, compact steps,
    // smaller token budget — the old 5-recipe call timed out ~3 min.
    assert.match(prompt, /Generate 3 distinct recipes/);
    assert.match(prompt, /at most 8 steps/);
    assert.match(prompt, /dietaryTags must be true for EVERY ingredient/);
    assert.doesNotMatch(prompt, /Generate 5 distinct recipes/);
  });
});

test('POST /api/suggest-recipes with lang ur asks for English ingredient names (nameEn)', async () => {
  await withCapturedOpenRouter({ ingredients: ['Chicken'], lang: 'ur' }, async (captured) => {
    const prompt = openRouterPromptText(captured);
    assert.match(prompt, /"nameEn"/);
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

test('isAdminEmail compares case-insensitively and fails closed', () => {
  assert.equal(isAdminEmail('adiltariq0327@gmail.com', 'adiltariq0327@gmail.com'), true);
  assert.equal(isAdminEmail('AdilTariq0327@Gmail.com', 'adiltariq0327@gmail.com'), true);
  assert.equal(isAdminEmail('someone-else@gmail.com', 'adiltariq0327@gmail.com'), false);
  assert.equal(isAdminEmail(undefined, 'adiltariq0327@gmail.com'), false);
  assert.equal(isAdminEmail('adiltariq0327@gmail.com', null), false);
});

test('listAdminUsers maps profile rows', async () => {
  const stub = {
    from: () => ({
      select: () => ({
        order: async () => ({
          data: [
            { id: 'u1', email: 'a@example.com', is_pro: true, created_at: '2026-11-18T00:00:00Z' },
            { id: 'u2', email: 'b@example.com', is_pro: false, created_at: '2026-11-17T00:00:00Z' },
          ],
          error: null,
        }),
      }),
    }),
  };
  const users = await listAdminUsers(stub as never);
  assert.deepEqual(users, [
    { id: 'u1', email: 'a@example.com', is_pro: true, created_at: '2026-11-18T00:00:00Z' },
    { id: 'u2', email: 'b@example.com', is_pro: false, created_at: '2026-11-17T00:00:00Z' },
  ]);
});

test('setUserPro returns the updated row and validates its inputs', async () => {
  const row = { id: 'u1', email: 'a@example.com', is_pro: true, created_at: '2026-11-18T00:00:00Z' };
  const stub = {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: row, error: null }),
          }),
        }),
      }),
    }),
  };
  const updated = await setUserPro(stub as never, 'u1', true);
  assert.deepEqual(updated, row);

  await assert.rejects(
    () => setUserPro(stub as never, '', true),
    (e: unknown) => (e as { code?: string }).code === 'VALIDATION',
  );
  await assert.rejects(
    () => setUserPro(stub as never, 'u1', 'yes' as never),
    (e: unknown) => (e as { code?: string }).code === 'VALIDATION',
  );
});

test('GET /api/admin/users without a token returns 401', async () => {
  const { server, base } = await startTestServer();
  try {
    const res = await fetch(`${base}/api/admin/users`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, 'UNAUTHENTICATED');
  } finally {
    server.close();
  }
});

test('GET /api/admin/users with an invalid token returns 401, not a 500', async () => {
  const { server, base } = await startTestServer();
  try {
    const res = await fetch(`${base}/api/admin/users`, {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, 'UNAUTHENTICATED');
  } finally {
    server.close();
  }
});

test('POST /api/admin/set-pro without a token returns 401', async () => {
  const { server, base } = await startTestServer();
  try {
    const res = await fetch(`${base}/api/admin/set-pro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'u1', isPro: true }),
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
