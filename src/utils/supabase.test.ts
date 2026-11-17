import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSupabaseClient,
  getSupabaseConfig,
  isSupabaseConfigured,
  isValidSupabaseUrl,
} from './supabase.ts';

test('isValidSupabaseUrl accepts only https URLs with a host', () => {
  assert.equal(isValidSupabaseUrl('https://woczqvbzrxekfckhfyui.supabase.co'), true);
  assert.equal(isValidSupabaseUrl('http://woczqvbzrxekfckhfyui.supabase.co'), false);
  assert.equal(isValidSupabaseUrl('https://'), false);
  assert.equal(isValidSupabaseUrl('not a url'), false);
  assert.equal(isValidSupabaseUrl(''), false);
});

test('getSupabaseConfig returns null when vars are missing or placeholders', () => {
  assert.equal(getSupabaseConfig({}), null);
  assert.equal(getSupabaseConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' }), null);
  assert.equal(
    getSupabaseConfig({
      VITE_SUPABASE_URL: 'MY_SUPABASE_URL',
      VITE_SUPABASE_ANON_KEY: 'MY_SUPABASE_ANON_KEY',
    }),
    null,
  );
  assert.equal(
    getSupabaseConfig({
      VITE_SUPABASE_URL: 'http://x.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'key',
    }),
    null,
  );
});

test('getSupabaseConfig returns the config when both vars are valid', () => {
  assert.deepEqual(
    getSupabaseConfig({
      VITE_SUPABASE_URL: 'https://woczqvbzrxekfckhfyui.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    }),
    {
      url: 'https://woczqvbzrxekfckhfyui.supabase.co',
      anonKey: 'test-anon-key',
    },
  );
});

test('isSupabaseConfigured mirrors getSupabaseConfig', () => {
  assert.equal(isSupabaseConfigured({}), false);
  assert.equal(
    isSupabaseConfigured({
      VITE_SUPABASE_URL: 'https://x.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'key',
    }),
    true,
  );
});

test('getSupabaseClient returns null without config and a client with one', () => {
  // In plain Node there is no import.meta.env, so the default call is
  // unconfigured — the app must treat that as guest mode, not a crash.
  assert.equal(getSupabaseClient(), null);
  assert.equal(getSupabaseClient(null), null);
  const client = getSupabaseClient({
    url: 'https://example.supabase.co',
    anonKey: 'test-anon-key',
  });
  assert.ok(client !== null);
  assert.equal(typeof client.auth.getSession, 'function');
});
