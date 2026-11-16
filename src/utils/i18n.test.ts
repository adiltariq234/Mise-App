import test from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, fmt, getStrings, isLanguage } from './i18n.ts';

test('English and Urdu dictionaries carry exactly the same keys', () => {
  const enKeys = Object.keys(STRINGS.en).sort();
  const urKeys = Object.keys(STRINGS.ur).sort();
  assert.deepEqual(urKeys, enKeys);
  for (const key of enKeys) {
    assert.ok(
      STRINGS.en[key as keyof typeof STRINGS.en].trim().length > 0,
      `en.${key} is empty`,
    );
    assert.ok(
      STRINGS.ur[key as keyof typeof STRINGS.ur].trim().length > 0,
      `ur.${key} is empty`,
    );
  }
});

test('getStrings falls back to English for unknown languages', () => {
  assert.equal(getStrings('ur').recipes, 'تراکیب');
  assert.equal(getStrings('xx' as never).recipes, 'Recipes');
});

test('fmt fills placeholders in both languages', () => {
  assert.equal(
    fmt(STRINGS.en.showingLine, { shown: 3, total: 5 }),
    'Showing 3 of 5 recipes',
  );
  assert.equal(
    fmt(STRINGS.ur.showingLine, { shown: 3, total: 5 }),
    '5 میں سے 3 تراکیب دکھائی جا رہی ہیں',
  );
  assert.equal(fmt(STRINGS.ur.forRecipe, { title: 'Omelette' }), 'Omelette کے لیے');
});

test('isLanguage accepts only en and ur', () => {
  assert.equal(isLanguage('en'), true);
  assert.equal(isLanguage('ur'), true);
  assert.equal(isLanguage('fr'), false);
  assert.equal(isLanguage(null), false);
});
