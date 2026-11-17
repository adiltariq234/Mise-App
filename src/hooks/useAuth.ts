/**
 * useSupabaseAuth — React state for Supabase Auth (Google + email).
 *
 * When Supabase is not configured (no VITE_SUPABASE_* env vars) the
 * hook reports `configured: false` and every action is a no-op — the
 * app stays in guest mode and nothing breaks. The AuthPanel renders
 * nothing in that case.
 *
 * Email sign-up: Supabase may require email confirmation (project
 * setting). When sign-up succeeds but returns no session, the hook
 * sets `noticeKey: 'authConfirmEmail'` instead of treating it as an
 * error — the user must click the link in their inbox first.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  friendlyAuthError,
  toAuthUser,
  validateCredentials,
  type AuthErrorKey,
  type AuthUser,
} from '../utils/auth.ts';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabase.ts';

export interface AuthState {
  configured: boolean;
  /** Null while the session is being restored, then the user or null. */
  user: AuthUser | null;
  loading: boolean;
  /** True while a sign-in / sign-up / sign-out call is in flight. */
  busy: boolean;
  errorKey: AuthErrorKey | null;
  noticeKey: 'authConfirmEmail' | null;
  noticeEmail: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export function useSupabaseAuth(): AuthState {
  // getSupabaseClient() is a cached singleton (null when unconfigured),
  // so calling it on every render is cheap and always the same client.
  const client = getSupabaseClient();
  const configured = isSupabaseConfigured();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(configured);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [noticeKey, setNoticeKey] = useState<'authConfirmEmail' | null>(null);
  const [noticeEmail, setNoticeEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(toAuthUser(data.session?.user));
      setLoading(false);
    });
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(toAuthUser(session?.user));
      setLoading(false);
    });
    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  const clearError = useCallback(() => {
    setErrorKey(null);
    setNoticeKey(null);
    setNoticeEmail(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!client) return;
    clearError();
    setBusy(true);
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) setErrorKey(friendlyAuthError(error.message));
      // On success the browser navigates to Google and back; the
      // onAuthStateChange listener picks the session up on return.
    } catch (err) {
      setErrorKey(friendlyAuthError(err instanceof Error ? err.message : null));
    } finally {
      setBusy(false);
    }
  }, [client, clearError]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!client) return;
      clearError();
      const validation = validateCredentials(email, password);
      if (validation) {
        setErrorKey(validation);
        return;
      }
      setBusy(true);
      try {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) setErrorKey(friendlyAuthError(error.message));
      } catch (err) {
        setErrorKey(friendlyAuthError(err instanceof Error ? err.message : null));
      } finally {
        setBusy(false);
      }
    },
    [client, clearError],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!client) return;
      clearError();
      const validation = validateCredentials(email, password);
      if (validation) {
        setErrorKey(validation);
        return;
      }
      setBusy(true);
      try {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          setErrorKey(friendlyAuthError(error.message));
        } else if (!data.session && data.user) {
          // Email confirmation is on: no session until the user
          // clicks the link Supabase emailed them.
          setNoticeKey('authConfirmEmail');
          setNoticeEmail(email.trim());
        }
      } catch (err) {
        setErrorKey(friendlyAuthError(err instanceof Error ? err.message : null));
      } finally {
        setBusy(false);
      }
    },
    [client, clearError],
  );

  const signOut = useCallback(async () => {
    if (!client) return;
    clearError();
    setBusy(true);
    try {
      const { error } = await client.auth.signOut();
      if (error) setErrorKey(friendlyAuthError(error.message));
    } catch (err) {
      setErrorKey(friendlyAuthError(err instanceof Error ? err.message : null));
    } finally {
      setBusy(false);
    }
  }, [client, clearError]);

  return {
    configured,
    user,
    loading,
    busy,
    errorKey,
    noticeKey,
    noticeEmail,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    clearError,
  };
}
