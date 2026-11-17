/**
 * AuthPanel — sign-in / account panel in the left sidebar.
 *
 * - Renders NOTHING when Supabase is not configured (guest mode).
 * - Guest: Google button + email/password form (sign-in / sign-up).
 * - Signed in: email + sign-out + cloud sync status.
 * - After a first sign-in, offers a one-time upload of the local data
 *   (the local copy is kept either way — the upload never deletes it).
 */
import { useState, type FormEvent } from 'react';
import { LogIn, LogOut, UploadCloud, UserRound } from 'lucide-react';
import type { AuthState } from '../hooks/useAuth.ts';
import { fmt, type UiStrings } from '../utils/i18n.ts';

export type CloudStatus = 'off' | 'loading' | 'synced' | 'error';

interface AuthPanelProps {
  auth: AuthState;
  cloudStatus: CloudStatus;
  showUploadPrompt: boolean;
  onUploadLocalData: () => void;
  onDismissUpload: () => void;
  s: UiStrings;
}

export function AuthPanel({
  auth,
  cloudStatus,
  showUploadPrompt,
  onUploadLocalData,
  onDismissUpload,
  s,
}: AuthPanelProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign-in is not configured (no env vars) — stay invisible so the
  // guest experience is exactly what it was before this feature.
  if (!auth.configured) return null;

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') {
      void auth.signInWithEmail(email, password);
    } else {
      void auth.signUpWithEmail(email, password);
    }
  };

  return (
    <section
      aria-label={s.authTitle}
      className="rounded-xl border border-slate-200 bg-white px-4 py-4"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <UserRound className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        {s.authTitle}
      </h3>

      {auth.user ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-700">
            {fmt(s.authSignedInAs, { email: auth.user.email ?? '—' })}
          </p>
          {cloudStatus === 'loading' || cloudStatus === 'off' ? null : (
            <p
              role="status"
              className={`text-xs ${
                cloudStatus === 'synced' ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {cloudStatus === 'synced' ? s.authSynced : s.authSyncError}
            </p>
          )}
          {showUploadPrompt ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <p className="text-sm text-emerald-900">{s.authUploadPrompt}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onUploadLocalData}
                  disabled={auth.busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <UploadCloud className="h-4 w-4" aria-hidden="true" />
                  {s.authUpload}
                </button>
                <button
                  type="button"
                  onClick={onDismissUpload}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {s.authKeepLocal}
                </button>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void auth.signOut()}
            disabled={auth.busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {s.signOut}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-600">{s.authIntro}</p>
          <button
            type="button"
            onClick={() => void auth.signInWithGoogle()}
            disabled={auth.busy || auth.loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {s.signInWithGoogle}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            {s.authOrDivider}
            <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
          </div>
          <form onSubmit={handleEmailSubmit} className="space-y-2">
            <label className="block">
              <span className="sr-only">{s.emailAddress}</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={s.emailAddress}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="sr-only">{s.password}</span>
              <input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={s.password}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={auth.busy || auth.loading}
              className="w-full rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {mode === 'signin' ? s.signInWithEmail : s.createAccount}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              auth.clearError();
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            }}
            className="text-xs font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
          >
            {mode === 'signin' ? s.authNeedAccount : s.authHaveAccount}
          </button>
          {auth.errorKey ? (
            <p role="alert" className="text-sm text-rose-700">
              {s[auth.errorKey]}
            </p>
          ) : null}
          {auth.noticeKey && auth.noticeEmail ? (
            <p role="status" className="text-sm text-emerald-700">
              {fmt(s[auth.noticeKey], { email: auth.noticeEmail })}
            </p>
          ) : null}
          <p className="text-xs text-slate-500">{s.authGuestNote}</p>
        </div>
      )}
    </section>
  );
}
