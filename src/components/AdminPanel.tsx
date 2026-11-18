import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase.ts';
import {
  isAdminUserEmail,
  updateUserPro,
  type AdminUser,
} from '../utils/admin.ts';
import type { UiStrings } from '../utils/i18n.ts';

async function fetchAccessToken(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

function formatJoinedAt(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

/**
 * Admin panel — users list + Pro toggle. Rendered in the sidebar by
 * App.tsx, but returns nothing unless the signed-in user is the admin
 * (adiltariq0327@gmail.com). The server re-checks the caller's JWT
 * against ADMIN_EMAIL on every admin request; this visibility check is
 * UI only.
 */
export function AdminPanel({
  userEmail,
  s,
}: {
  userEmail: string | null;
  s: UiStrings;
}) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<'load' | 'toggle' | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isAdmin = isAdminUserEmail(userEmail);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await fetchAccessToken();
        if (!token) {
          if (!cancelled) setError('load');
          return;
        }
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setError('load');
          return;
        }
        const body = (await res.json()) as { users?: AdminUser[] };
        if (!cancelled) setUsers(Array.isArray(body.users) ? body.users : []);
      } catch {
        if (!cancelled) setError('load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Non-admins see nothing at all — the panel is admin-only.
  if (!isAdmin) return null;

  const handleTogglePro = async (user: AdminUser) => {
    setError(null);
    setTogglingId(user.id);
    try {
      const token = await fetchAccessToken();
      if (!token) {
        setError('toggle');
        return;
      }
      const res = await fetch('/api/admin/set-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id, isPro: !user.is_pro }),
      });
      if (!res.ok) {
        setError('toggle');
        return;
      }
      const body = (await res.json()) as { user?: AdminUser };
      setUsers((prev) =>
        prev && body.user
          ? updateUserPro(prev, body.user.id, body.user.is_pro)
          : prev,
      );
    } catch {
      setError('toggle');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <section
      aria-label={s.adminTitle}
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-900">{s.adminTitle}</h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.adminIntro}</p>

      {error === 'load' ? (
        <p role="alert" className="mt-3 text-sm text-amber-700">
          {s.adminLoadError}
        </p>
      ) : null}
      {error === 'toggle' ? (
        <p role="alert" className="mt-3 text-sm text-amber-700">
          {s.adminToggleError}
        </p>
      ) : null}

      {users === null && error !== 'load' ? (
        <p className="mt-3 text-sm text-slate-500">{s.adminLoading}</p>
      ) : null}
      {users !== null && users.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{s.adminNoUsers}</p>
      ) : null}
      {users !== null && users.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {user.email}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatJoinedAt(user.created_at)} ·{' '}
                  {user.is_pro ? s.adminPro : s.adminFree}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleTogglePro(user)}
                disabled={togglingId === user.id}
                className="shrink-0 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
              >
                {user.is_pro ? s.adminRemovePro : s.adminMakePro}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
