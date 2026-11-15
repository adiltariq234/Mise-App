import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStored, saveStored, removeStored } from './storage.ts';

// Minimal localStorage mock for node (the real one only exists in browsers).
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  length: 0,
} as Storage;

test('saveStored/loadStored round-trips versioned data', () => {
  assert.equal(saveStored('mise_test_key', 1, { a: 1 }), true);
  assert.deepEqual(loadStored<{ a: number }>('mise_test_key', 1), { a: 1 });
});

test('loadStored rejects a different schema version', () => {
  saveStored('mise_test_key2', 1, { a: 1 });
  assert.equal(loadStored('mise_test_key2', 2), null);
});

test('loadStored returns null for missing or corrupted data', () => {
  assert.equal(loadStored('mise_missing_key', 1), null);
  store.set('mise_corrupt', 'not-json{{{');
  assert.equal(loadStored('mise_corrupt', 1), null);
});

test('removeStored deletes the key', () => {
  saveStored('mise_test_key3', 1, [1, 2, 3]);
  removeStored('mise_test_key3');
  assert.equal(loadStored('mise_test_key3', 1), null);
});
