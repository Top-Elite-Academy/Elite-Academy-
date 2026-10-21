import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Browser, createUser, signIn } from './helpers/browser';
import { createTestApp, type TestApp } from './helpers/test-app';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.reset();
});

describe('ownership checks (IDOR, spec §9.2)', () => {
  it("does not let a student read another student's profile or consents", async () => {
    const alice = await createUser(t, { email: 'alice@test.dev', roles: ['student'] });
    const bob = await createUser(t, { email: 'bob@test.dev', roles: ['student'] });
    await t.prisma.consent.create({
      data: {
        userId: bob.id,
        type: 'contact',
        textVersion: 'v1',
        text: 'I agree',
        ip: '127.0.0.1',
      },
    });
    const browser = await signIn(t, alice);

    expect((await browser.get(`/api/users/${alice.id}`)).status).toBe(200);
    // 404, not 403: the response must not reveal that Bob exists.
    expect((await browser.get(`/api/users/${bob.id}`)).status).toBe(404);
    expect((await browser.get(`/api/users/${bob.id}/consents`)).status).toBe(404);
  });

  it('lets an admin read any profile', async () => {
    const admin = await createUser(t, {
      email: 'admin@test.dev',
      roles: ['admin'],
      withTotp: true,
    });
    const bob = await createUser(t, { email: 'bob@test.dev', roles: ['student'] });
    const browser = await signIn(t, admin);

    const response = await browser.get(`/api/users/${bob.id}`);
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('bob@test.dev');
  });

  it('rejects ids that are not UUIDs', async () => {
    const alice = await createUser(t, { email: 'alice@test.dev', roles: ['student'] });
    const browser = await signIn(t, alice);
    expect((await browser.get('/api/users/1')).status).toBe(400);
  });
});

describe('deny by default', () => {
  it('requires a session for every non-public route', async () => {
    const browser = await new Browser(t).open();
    const response = await browser.get('/api/users/me');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ statusCode: 401, code: 'auth.required' });
  });
});

describe('mass assignment', () => {
  it('refuses fields a user may not change and leaves roles untouched', async () => {
    const alice = await createUser(t, { email: 'alice@test.dev', roles: ['student'] });
    const browser = await signIn(t, alice);

    const response = await browser.patch('/api/users/me', { locale: 'ar', roles: ['admin'] });
    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toHaveProperty('_form');

    const roles = await t.prisma.userRole.findMany({ where: { userId: alice.id } });
    expect(roles.map((r) => r.role)).toEqual(['student']);
  });

  it('saves allowed preferences and writes an audit entry', async () => {
    const alice = await createUser(t, { email: 'alice@test.dev', roles: ['student'] });
    const browser = await signIn(t, alice);

    const response = await browser.patch('/api/users/me', { locale: 'ar', timeZone: 'UTC' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ locale: 'ar', timeZone: 'UTC' });

    const entry = await t.prisma.auditLog.findFirst({
      where: { action: 'user.preferences.updated' },
    });
    expect(entry?.actorId).toBe(alice.id);
  });
});

describe('audit log', () => {
  it('is append-only at the database level', async () => {
    const alice = await createUser(t, { email: 'alice@test.dev', roles: ['student'] });
    await signIn(t, alice);
    const entry = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'auth.login.succeeded' },
    });

    await expect(
      t.prisma.auditLog.update({ where: { id: entry.id }, data: { action: 'tampered' } }),
    ).rejects.toThrow();
    await expect(t.prisma.auditLog.delete({ where: { id: entry.id } })).rejects.toThrow();
  });
});

describe('security headers', () => {
  it('are present on API responses', async () => {
    const response = await new Browser(t).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.headers).toMatchObject({
      'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-frame-options': 'DENY',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    });
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
