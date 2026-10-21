import 'server-only';

/** Where the web server reaches the NestJS API (server-side only; never sent to browsers). */
export const API_INTERNAL_URL = process.env['API_INTERNAL_URL'] ?? 'http://127.0.0.1:4000';
