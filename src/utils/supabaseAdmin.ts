/**
 * Server-side Supabase admin client (Node only — never imported by the
 * browser bundle).
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY, which bypasses row-level security and
 * must stay server-only: never expose it to the client, never give it
 * a VITE_ prefix, never log it. The URL may come from SUPABASE_URL or
 * the public VITE_SUPABASE_URL (same value, already set in Vercel).
 *
 * The only server use today is verifying a user's access token
 * (GET /api/auth/me) so future per-user endpoints can trust the
 * caller's identity. The AI endpoints stay anonymous — guests can
 * still scan without an account.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminSingleton: SupabaseClient | null | undefined;

export function getSupabaseAdmin(
  envOverride?: Record<string, string | undefined>,
): SupabaseClient | null {
  if (envOverride !== undefined) {
    const url = (envOverride.SUPABASE_URL || envOverride.VITE_SUPABASE_URL || '').trim();
    const key = (envOverride.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!url || !key) return null;
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  if (adminSingleton !== undefined) return adminSingleton;
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    adminSingleton = null;
    return null;
  }
  try {
    adminSingleton = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    adminSingleton = null;
  }
  return adminSingleton;
}

export interface VerifiedUser {
  id: string;
  email?: string;
}

/**
 * Verify a Supabase access token (the JWT the browser client sends as
 * `Authorization: Bearer <token>`) against the Auth server. Returns
 * the user, or null for a missing/expired/invalid token. `client` is
 * injectable so tests can pass a stub instead of a live project.
 */
export async function verifyUserToken(
  accessToken: string,
  client: SupabaseClient | null = getSupabaseAdmin(),
): Promise<VerifiedUser | null> {
  if (!client || !accessToken) return null;
  try {
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? undefined };
  } catch {
    return null;
  }
}
