import 'server-only';
import type { MeResponse, Role } from '@eta/shared';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { ROUTES } from '@/config/navigation';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/api/server';

/**
 * Page guard for server components. Signed-out visitors go to sign-in and come
 * back afterwards; a signed-in user without the role gets a 404 (same as the API).
 * This only decides what to render — the API enforces access on every request.
 */
export async function requireUser(returnTo: string, roles?: Role[]): Promise<MeResponse> {
  const user = await getCurrentUser();
  if (!user) {
    const locale = await getLocale();
    return redirect({ href: `${ROUTES.login}?next=${encodeURIComponent(returnTo)}`, locale });
  }
  if (roles && !roles.some((role) => user.roles.includes(role))) notFound();
  return user;
}
