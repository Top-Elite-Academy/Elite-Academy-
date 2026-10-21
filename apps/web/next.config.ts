import { existsSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// One .env for the whole monorepo (values already in the environment win).
const rootEnv = path.resolve(__dirname, '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const apiInternalUrl = process.env['API_INTERNAL_URL'] ?? 'http://127.0.0.1:4000';

/**
 * Security headers on every response (spec §9.3). The Content-Security-Policy
 * needs a per-request nonce, so it is set in src/proxy.ts instead.
 */
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  headers: () => Promise.resolve([{ source: '/:path*', headers: SECURITY_HEADERS }]),
  // The browser only talks to this origin; /api/* is forwarded to the NestJS API,
  // so session cookies are first-party and no CORS is needed.
  rewrites: () =>
    Promise.resolve([{ source: '/api/:path*', destination: `${apiInternalUrl}/api/:path*` }]),
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
