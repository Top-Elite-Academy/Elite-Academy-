/**
 * The only way the API calls other servers (spec §9.3 SSRF): hosts must be on
 * this allow-list, requests use HTTPS and time out. Add hosts as integrations
 * arrive (payments, video, Zoom, WhatsApp…).
 */
const ALLOWED_HOSTS = new Set(['challenges.cloudflare.com', 'api.pwnedpasswords.com']);
const TIMEOUT_MS = 5_000;

export async function outboundFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    throw new Error(`Outbound request to ${target.hostname} is not allowed`);
  }
  return fetch(target, { ...init, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });
}
