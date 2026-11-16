/**
 * Read-aloud voice selection.
 *
 * The browser's speechSynthesis voices come from the device — an Android
 * phone usually has an Urdu (ur-PK) voice installed, a desktop browser
 * often has none. These helpers are pure (no window access) so they are
 * unit-testable; CookingMode.tsx wires them to the live voice list.
 *
 * Rules:
 * - A voice the user explicitly picked in the picker always wins, in
 *   either language — the picker is the user's choice.
 * - Otherwise, in Urdu mode, prefer a ur-PK voice, then any ur-* voice.
 * - Otherwise (English, or no matching voice): undefined, which means
 *   the browser's system default voice.
 */

export interface PickableVoice {
  voiceURI: string;
  lang: string;
  name: string;
}

const URDU_PREFIX = 'ur';

/** True when the voice's language is Urdu (ur-PK, ur-IN, ...). */
export function isUrduVoice(voice: { lang: string }): boolean {
  return voice.lang.trim().toLowerCase().startsWith(URDU_PREFIX);
}

/** True when at least one Urdu voice is installed on this device. */
export function hasUrduVoice(
  voices: readonly { lang: string }[],
): boolean {
  return voices.some(isUrduVoice);
}

/** Prefer ur-PK, then any other ur-* voice. */
export function findUrduVoice<T extends PickableVoice>(
  voices: readonly T[],
): T | undefined {
  const lower = (v: T) => v.lang.trim().toLowerCase();
  return (
    voices.find((v) => lower(v) === 'ur-pk') ??
    voices.find((v) => lower(v).startsWith(URDU_PREFIX))
  );
}

/**
 * Pick the voice read-aloud should use for the given UI language.
 * Returns undefined for "let the browser pick its default voice".
 * Generic over the voice type so a real SpeechSynthesisVoice stays
 * assignable to utterance.voice.
 */
export function pickVoiceForLang<T extends PickableVoice>(
  voices: readonly T[],
  lang: 'en' | 'ur',
  savedURI: string | null,
): T | undefined {
  if (savedURI) {
    const saved = voices.find((v) => v.voiceURI === savedURI);
    if (saved) return saved;
  }
  if (lang === 'ur') return findUrduVoice(voices);
  return undefined;
}

/**
 * Voices for the picker dropdown: Urdu voices first when the UI is in
 * Urdu, otherwise the browser's original order, untouched.
 */
export function sortVoicesForLang<T extends PickableVoice>(
  voices: readonly T[],
  lang: 'en' | 'ur',
): T[] {
  if (lang !== 'ur') return [...voices];
  return [
    ...voices.filter(isUrduVoice),
    ...voices.filter((v) => !isUrduVoice(v)),
  ];
}
