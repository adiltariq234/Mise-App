/**
 * Pure auth helpers — no Supabase calls here, so every function is
 * unit-testable without a network or a configured project.
 *
 * Error mapping: Supabase returns English API messages; this module
 * maps them to i18n keys so the UI can show the message in the user's
 * language (see UiStrings in i18n.ts).
 */
import type { User } from '@supabase/supabase-js';

/** The app's own view of a signed-in user — only what the UI needs. */
export interface AuthUser {
  id: string;
  email: string | null;
}

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

export type AuthErrorKey =
  | 'authInvalidCredentials'
  | 'authEmailExists'
  | 'authPasswordTooShort'
  | 'authInvalidEmail'
  | 'authEmailNotConfirmed'
  | 'authErrorGeneric';

/**
 * Map a Supabase (or validation) error message to an i18n key.
 * Unknown messages fall back to the generic key — raw provider text
 * is never shown to the user.
 */
export function friendlyAuthError(message: string | undefined | null): AuthErrorKey {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'authInvalidCredentials';
  if (
    m.includes('user already registered') ||
    m.includes('already been registered') ||
    m.includes('already exists')
  ) {
    return 'authEmailExists';
  }
  if (m.includes('password') && (m.includes('at least') || m.includes('6 characters'))) {
    return 'authPasswordTooShort';
  }
  if (m.includes('invalid email') || (m.includes('email') && m.includes('invalid'))) {
    return 'authInvalidEmail';
  }
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'authEmailNotConfirmed';
  }
  return 'authErrorGeneric';
}

/** Minimal email shape check — the provider does the real validation. */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/**
 * Client-side credential check run before any Supabase call, so the
 * user gets an instant, localised error instead of a round trip.
 * Returns the error key, or null when the credentials look usable.
 */
export function validateCredentials(email: string, password: string): AuthErrorKey | null {
  if (!isValidEmail(email)) return 'authInvalidEmail';
  if (password.length < 6) return 'authPasswordTooShort';
  return null;
}
