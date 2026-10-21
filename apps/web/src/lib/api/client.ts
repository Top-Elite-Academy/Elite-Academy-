'use client';

import type { ApiErrorBody } from '@eta/shared';
import { ApiError } from './api-error';

let csrfToken: Promise<string> | null = null;

/** The API's CSRF token, fetched once per page load (double-submit cookie pattern). */
function getCsrfToken(): Promise<string> {
  csrfToken ??= fetch('/api/auth/csrf', { credentials: 'same-origin' })
    .then((response) => response.json() as Promise<{ csrfToken: string }>)
    .then((body) => body.csrfToken)
    .catch((error: unknown) => {
      csrfToken = null;
      throw error;
    });
  return csrfToken;
}

/**
 * Browser → API calls. Same origin only (/api is proxied by Next.js), JSON in
 * and out, CSRF token on every state-changing request, errors as ApiError.
 */
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: `/api/${string}`,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      headers['X-CSRF-Token'] = await getCsrfToken();
    }
    response = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw ApiError.network();
  }

  if (response.status === 204 || response.status === 202) return undefined as T;
  const data = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    throw new ApiError({ ...(data as Partial<ApiErrorBody>), statusCode: response.status });
  }
  return data as T;
}
