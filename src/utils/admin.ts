/**
 * Admin helpers (client side). The operator's account — the only email
 * that may use the admin panel. This constant only decides whether the
 * panel is SHOWN; the server re-checks the caller's Supabase JWT
 * against the ADMIN_EMAIL env var on every /api/admin/* request, so
 * hiding the panel here is UI only, never the gate.
 */
export const ADMIN_EMAIL = 'adiltariq0327@gmail.com';

export function isAdminUserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export interface AdminUser {
  id: string;
  email: string;
  is_pro: boolean;
  created_at: string;
}

/** Pure list update for the Pro toggle (tested without React). */
export function updateUserPro(
  users: AdminUser[],
  userId: string,
  isPro: boolean,
): AdminUser[] {
  return users.map((user) =>
    user.id === userId ? { ...user, is_pro: isPro } : user,
  );
}
