import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { buildCsp, createNonce } from './lib/security/csp';

const handleI18nRouting = createMiddleware(routing);

/**
 * Runs before every page:
 * 1. creates a CSP nonce; Next.js reads it from the request header and adds it to its own scripts;
 * 2. routes to the right language (/en, /ar, /he).
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp(nonce, {
    isDev: process.env.NODE_ENV === 'development',
    upgradeInsecureRequests: process.env['WEB_ORIGIN']?.startsWith('https://') ?? false,
  });

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  // First-time visitors get English (product decision); a language they picked
  // before is remembered in the NEXT_LOCALE cookie and still wins.
  headers.delete('accept-language');

  const response = handleI18nRouting(new NextRequest(request.url, { headers }));
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Pages only: skip the API proxy, Next.js internals and files with an extension.
  matcher: [
    {
      source: '/((?!api|_next|_vercel|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
