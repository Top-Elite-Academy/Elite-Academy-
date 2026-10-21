import 'server-only';
import type { MeResponse } from '@eta/shared';
import { cookies } from 'next/headers';

const API_INTERNAL_URL = process.env['API_INTERNAL_URL'] ?? 'http://127.0.0.1:4000';

/**
 * The signed-in user for server components, or null. The browser's cookies
 * are forwarded so the API makes the decision — the web app never trusts itself.
 */
export async function getCurrentUser(): Promise<MeResponse | null> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;
  try {
    const response = await fetch(`${API_INTERNAL_URL}/api/users/me`, {
      headers: { cookie: cookieHeader, accept: 'application/json' },
      cache: 'no-store',
    });
    return response.ok ? ((await response.json()) as MeResponse) : null;
  } catch {
    return null;
  }
}
