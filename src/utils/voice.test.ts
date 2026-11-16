import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findUrduVoice,
  hasUrduVoice,
  isUrduVoice,
  pickVoiceForLang,
  sortVoicesForLang,
  type PickableVoice,
} from './voice.ts';

const EN_VOICE: PickableVoice = {
  voiceURI: 'urn:en-us',
  lang: 'en-US',
  name: 'English US',
};
const EN_GB_VOICE: PickableVoice = {
  voiceURI: 'urn:en-gb',
  lang: 'en-GB',
  name: 'English UK',
};
const UR_PK_VOICE: PickableVoice = {
  voiceURI: 'urn:ur-pk',
  lang: 'ur-PK',
  name: 'Urdu Pakistan',
};
const UR_IN_VOICE: PickableVoice = {
  voiceURI: 'urn:ur-in',
  lang: 'ur-IN',
  name: 'Urdu India',
};

test('isUrduVoice matches ur-* languages only', () => {
  assert.equal(isUrduVoice(UR_PK_VOICE), true);
  assert.equal(isUrduVoice(UR_IN_VOICE), true);
  assert.equal(isUrduVoice({ lang: 'UR-pk' }), true);
  assert.equal(isUrduVoice(EN_VOICE), false);
  assert.equal(isUrduVoice({ lang: 'ur' }), true);
});

test('hasUrduVoice reports whether any Urdu voice is installed', () => {
  assert.equal(hasUrduVoice([EN_VOICE, UR_PK_VOICE]), true);
  assert.equal(hasUrduVoice([EN_VOICE, EN_GB_VOICE]), false);
  assert.equal(hasUrduVoice([]), false);
});

test('findUrduVoice prefers ur-PK over other ur-* voices', () => {
  assert.equal(
    findUrduVoice([UR_IN_VOICE, UR_PK_VOICE, EN_VOICE]),
    UR_PK_VOICE,
  );
  assert.equal(findUrduVoice([UR_IN_VOICE, EN_VOICE]), UR_IN_VOICE);
  assert.equal(findUrduVoice([EN_VOICE]), undefined);
});

test('pickVoiceForLang: English keeps the old behaviour exactly', () => {
  // A saved voice wins; otherwise the browser default (undefined).
  assert.equal(
    pickVoiceForLang([EN_VOICE, EN_GB_VOICE], 'en', 'urn:en-gb'),
    EN_GB_VOICE,
  );
  assert.equal(
    pickVoiceForLang([EN_VOICE, EN_GB_VOICE], 'en', null),
    undefined,
  );
  // A saved voice that no longer exists falls back to the default.
  assert.equal(
    pickVoiceForLang([EN_VOICE], 'en', 'urn:gone'),
    undefined,
  );
});

test('pickVoiceForLang: Urdu auto-picks an Urdu voice when none is saved', () => {
  assert.equal(
    pickVoiceForLang([EN_VOICE, UR_PK_VOICE], 'ur', null),
    UR_PK_VOICE,
  );
  assert.equal(
    pickVoiceForLang([EN_VOICE, UR_IN_VOICE], 'ur', null),
    UR_IN_VOICE,
  );
  assert.equal(pickVoiceForLang([EN_VOICE], 'ur', null), undefined);
});

test('pickVoiceForLang: an explicitly saved voice always wins', () => {
  // The user picked English in the picker — honour it even in Urdu mode.
  assert.equal(
    pickVoiceForLang([EN_VOICE, UR_PK_VOICE], 'ur', 'urn:en-us'),
    EN_VOICE,
  );
  assert.equal(
    pickVoiceForLang([EN_VOICE, UR_PK_VOICE], 'ur', 'urn:ur-pk'),
    UR_PK_VOICE,
  );
});

test('sortVoicesForLang puts Urdu voices first in Urdu mode only', () => {
  const voices = [EN_VOICE, UR_IN_VOICE, EN_GB_VOICE, UR_PK_VOICE];
  assert.deepEqual(sortVoicesForLang(voices, 'ur'), [
    UR_IN_VOICE,
    UR_PK_VOICE,
    EN_VOICE,
    EN_GB_VOICE,
  ]);
  // English mode keeps the browser's original order, untouched.
  assert.deepEqual(sortVoicesForLang(voices, 'en'), voices);
  // Does not mutate the input.
  assert.deepEqual(voices, [
    EN_VOICE,
    UR_IN_VOICE,
    EN_GB_VOICE,
    UR_PK_VOICE,
  ]);
});
