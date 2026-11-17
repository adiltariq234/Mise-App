import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SQL = readFileSync(
  new URL('../../supabase/migrations/0001_mise_core.sql', import.meta.url),
  'utf8',
);

const TABLES = [
  'profiles',
  'fridge_profiles',
  'scans',
  'favorites',
  'shopping_items',
  'meal_plans',
];

test('migration creates every table the app syncs', () => {
  for (const table of TABLES) {
    assert.ok(
      new RegExp(`create table if not exists public\\.${table} \\(`, 'i').test(SQL),
      `missing table ${table}`,
    );
  }
});

test('migration enables row-level security on every table', () => {
  for (const table of TABLES) {
    assert.ok(
      new RegExp(`alter table public\\.${table} enable row level security`, 'i').test(SQL),
      `RLS not enabled on ${table}`,
    );
  }
});

test('migration policies only allow a user their own rows', () => {
  // One policy per table, all gated on auth.uid().
  const policyCount = (SQL.match(/create policy /gi) || []).length;
  assert.equal(policyCount, TABLES.length);
  const uidUses = (SQL.match(/auth\.uid\(\) = (user_id|id)/g) || []).length;
  assert.ok(uidUses >= TABLES.length, `expected a uid() gate per table, got ${uidUses}`);
  assert.ok(!/auth\.uid\(\) = '[^']*'/.test(SQL), 'no hardcoded user id in policies');
});

test('migration references auth.users and cascades on delete', () => {
  assert.ok(SQL.includes('references auth.users (id) on delete cascade'));
});

test('migration contains no secrets or service-role key', () => {
  const lower = SQL.toLowerCase();
  assert.ok(!lower.includes('service_role'));
  assert.ok(!lower.includes('supabase_url'));
  assert.ok(!lower.includes('anon_key'));
  assert.ok(!lower.includes('eyj'), 'no JWT in the migration');
});

test('profiles carries the future Pro flag for the admin panel', () => {
  assert.ok(/is_pro boolean not null default false/i.test(SQL));
});
