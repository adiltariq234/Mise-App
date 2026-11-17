/**
 * Supabase client (browser side).
 *
 * The client is created lazily from the public env vars
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (set in Vercel for
 * Production + Preview). When either is missing the app keeps working
 * as a guest: every accessor returns null and callers must treat
 * "not configured" as "no account features", never as an error.
 *
 * The anon (publishable) key is safe to ship in the client bundle —
 * it only identifies the project; row-level security on the database
 * decides what a user may read or write. The service-role key must
 * NEVER appear here (see src/utils/supabaseAdmin.ts, server-only).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const PLACEHOLDER_URL = 'MY_SUPABASE_URL';
const PLACEHOLDER_KEY = 'MY_SUPABASE_ANON_KEY';

/** A Supabase project URL must be a valid https URL. */
export function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Read the browser env (Vite injects import.meta.env at build time).
 * `envOverride` exists so unit tests can supply values without a Vite
 * runtime — in plain Node, import.meta.env is undefined.
 */
export function getSupabaseConfig(
  envOverride?: Record<string, string | undefined>,
): SupabaseConfig | null {
  const env =
    envOverride ??
    ((
      import.meta as unknown as {
        env?: Record<string, string | undefined>;
      }
    ).env ??
      {});
  const url = (env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anonKey) return null;
  if (url === PLACEHOLDER_URL || anonKey === PLACEHOLDER_KEY) return null;
  if (!isValidSupabaseUrl(url)) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(
  envOverride?: Record<string, string | undefined>,
): boolean {
  return getSupabaseConfig(envOverride) !== null;
}

let clientSingleton: SupabaseClient | null | undefined;

/**
 * The shared browser client, or null when Supabase is not configured.
 * Pass an explicit config in tests; production callers omit it.
 */
export function getSupabaseClient(
  config?: SupabaseConfig | null,
): SupabaseClient | null {
  if (config !== undefined) {
    // Explicit config (tests / one-off callers) — no caching.
    if (!config) return null;
    return createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  if (clientSingleton !== undefined) return clientSingleton;
  const resolved = getSupabaseConfig();
  clientSingleton =
    resolved === null
      ? null
      : createClient(resolved.url, resolved.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
  return clientSingleton;
}
