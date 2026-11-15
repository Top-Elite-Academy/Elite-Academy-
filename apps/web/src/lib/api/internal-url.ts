import 'server-only';

/** Where the web server reaches the NestJS API (server-side only; never sent to browsers). */
export const API_INTERNAL_URL = process.env['API_INTERNAL_URL'] ?? 'http://127.0.0.1:4000';

/**
 * Header the edge fills with the visitor's IP (same setting as the API's CLIENT_IP_HEADER).
 * Empty locally: the API then uses the connection address.
 */
export const CLIENT_IP_HEADER = process.env['CLIENT_IP_HEADER']?.trim().toLowerCase() || undefined;
