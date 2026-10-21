/** Third-party origins the pages may use. Add the video player and payment page in later milestones. */
const TURNSTILE = 'https://challenges.cloudflare.com';

/**
 * Strict Content-Security-Policy with a per-request nonce (spec §9.3).
 * Only scripts carrying the nonce (and what they load, via 'strict-dynamic') run.
 */
export interface CspOptions {
  isDev: boolean;
  /** Only on HTTPS sites; on plain-http localhost it would break every asset. */
  upgradeInsecureRequests: boolean;
}

export function buildCsp(nonce: string, { isDev, upgradeInsecureRequests }: CspOptions): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'unsafe-eval' only in development: React uses eval for debugging stacks.
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Development style injection (hot reload) carries no nonce.
    'style-src': ["'self'", isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`],
    // Style ATTRIBUTES only (set by next/image for layout). They cannot run scripts;
    // <style> and <script> elements still need the nonce.
    'style-src-attr': ["'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", TURNSTILE, ...(isDev ? ['ws:'] : [])],
    'frame-src': [TURNSTILE],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (upgradeInsecureRequests) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

/** 128 random bits, base64. A new one for every request. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
