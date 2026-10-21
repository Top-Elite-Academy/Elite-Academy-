import 'server-only';
import type { MeResponse } from '@eta/shared';
import { cookies } from 'next/headers';
import { API_INTERNAL_URL } from './internal-url';

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

/**
 * Signed-in GET for server components (student area). Forwards the browser's
 * cookies; any failure is thrown so the page's error boundary is shown.
 */
export async function getAsUser<T>(path: `/api/${string}`): Promise<T> {
  const response = await fetch(`${API_INTERNAL_URL}${path}`, {
    headers: { cookie: (await cookies()).toString(), accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Could not load ${path}: HTTP ${response.status}`);
  return (await response.json()) as T;
}
