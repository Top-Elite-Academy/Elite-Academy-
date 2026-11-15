import 'server-only';
import type { MeResponse } from '@eta/shared';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { API_INTERNAL_URL, CLIENT_IP_HEADER } from './internal-url';

/**
 * Headers for an API call made on behalf of the visitor: their cookies, and
 * their IP in CLIENT_IP_HEADER (set by the edge, e.g. cf-connecting-ip), so the
 * API's per-IP rate limit counts each visitor instead of this web server.
 */
async function visitorHeaders(): Promise<Record<string, string>> {
  const forwarded: Record<string, string> = {
    cookie: (await cookies()).toString(),
    accept: 'application/json',
  };
  if (CLIENT_IP_HEADER) {
    const ip = (await headers()).get(CLIENT_IP_HEADER);
    if (ip) forwarded[CLIENT_IP_HEADER] = ip;
  }
  return forwarded;
}

/**
 * The signed-in user for server components, or null. The browser's cookies
 * are forwarded so the API makes the decision — the web app never trusts itself.
 * Asked once per request: the layout, page and header share the answer.
 */
export const getCurrentUser = cache(async (): Promise<MeResponse | null> => {
  const forwarded = await visitorHeaders();
  if (!forwarded['cookie']) return null;
  try {
    const response = await fetch(`${API_INTERNAL_URL}/api/users/me`, {
      headers: forwarded,
      cache: 'no-store',
    });
    return response.ok ? ((await response.json()) as MeResponse) : null;
  } catch {
    return null;
  }
});

/**
 * Signed-in GET for server components (student area). Forwards the browser's
 * cookies; any failure is thrown so the page's error boundary is shown.
 */
export async function getAsUser<T>(path: `/api/${string}`): Promise<T> {
  const response = await fetch(`${API_INTERNAL_URL}${path}`, {
    headers: await visitorHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Could not load ${path}: HTTP ${response.status}`);
  return (await response.json()) as T;
}
