import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupabaseAdmin, verifyUserToken } from './supabaseAdmin.ts';

test('getSupabaseAdmin returns null when the service key is missing', () => {
  assert.equal(getSupabaseAdmin({}), null);
  assert.equal(
    getSupabaseAdmin({ VITE_SUPABASE_URL: 'https://x.supabase.co' }),
    null,
  );
  assert.equal(
    getSupabaseAdmin({
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    }) !== null,
    true,
  );
});

test('verifyUserToken returns null without a client or token', async () => {
  assert.equal(await verifyUserToken('', null), null);
  assert.equal(await verifyUserToken('some-token', null), null);
});

test('verifyUserToken returns the user from a stubbed admin client', async () => {
  const stub = {
    auth: {
      getUser: async (_token: string) => ({
        data: { user: { id: 'user-1', email: 'adil@example.com' } },
        error: null,
      }),
    },
  } as never;
  assert.deepEqual(await verifyUserToken('valid-token', stub), {
    id: 'user-1',
    email: 'adil@example.com',
  });
});

test('verifyUserToken returns null when the provider rejects the token', async () => {
  const stub = {
    auth: {
      getUser: async (_token: string) => ({
        data: { user: null },
        error: { message: 'Invalid JWT' },
      }),
    },
  } as never;
  assert.equal(await verifyUserToken('bad-token', stub), null);
});

test('verifyUserToken returns null when the provider call throws', async () => {
  const stub = {
    auth: {
      getUser: async (_token: string) => {
        throw new Error('network down');
      },
    },
  } as never;
  assert.equal(await verifyUserToken('any-token', stub), null);
});
