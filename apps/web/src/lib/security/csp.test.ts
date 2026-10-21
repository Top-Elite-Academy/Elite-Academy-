import { describe, expect, it } from 'vitest';
import { buildCsp, createNonce } from './csp';

describe('buildCsp', () => {
  it('builds a strict production policy around the nonce', () => {
    const csp = buildCsp('abc123', { isDev: false, upgradeInsecureRequests: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-abc123'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('unsafe-inline');
  });

  it('relaxes only what development tooling needs', () => {
    const csp = buildCsp('abc123', { isDev: true, upgradeInsecureRequests: false });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});

describe('createNonce', () => {
  it('is different every time', () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});
