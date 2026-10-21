import { expect, test } from './fixtures';

test.describe('security headers (spec §9.3)', () => {
  test('every page has a strict CSP with a fresh nonce and the standard headers', async ({
    request,
  }) => {
    const first = await request.get('/en');
    const second = await request.get('/en');
    const headers = first.headers();

    expect(headers['strict-transport-security']).toBe(
      'max-age=63072000; includeSubDomains; preload',
    );
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(headers['x-powered-by']).toBeUndefined();

    const csp = headers['content-security-policy'] ?? '';
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).toMatch(/script-src [^;]*/);
    expect(csp.match(/script-src [^;]*/)?.[0]).not.toContain('unsafe-inline');
    expect(csp).not.toEqual(second.headers()['content-security-policy']);
  });

  test('private areas send signed-out visitors to sign-in with a safe return path', async ({
    page,
  }) => {
    await page.goto('/en/app');
    await expect(page).toHaveURL(/\/en\/login\?next=%2Fapp$/);
  });

  test('robots.txt keeps private areas out of search engines', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    for (const path of ['/*/app', '/*/admin', '/*/crm']) expect(robots).toContain(path);
  });
});
