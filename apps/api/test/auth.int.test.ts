import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Browser, createUser, PASSWORD, signIn, totpCode, WEB_ORIGIN } from './helpers/browser';
import { createTestApp, type TestApp, VALID_CAPTCHA } from './helpers/test-app';

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

describe('sign in (student)', () => {
  it('signs in with one step and returns only safe fields', async () => {
    await createUser(t, { email: 'student@test.dev', roles: ['student'] });
    const browser = await new Browser(t).open();

    const login = await browser.post('/api/auth/login', {
      email: 'Student@Test.dev',
      password: PASSWORD,
    });
    expect(login.status).toBe(200);
    expect(login.body).toEqual({ next: 'done' });

    const cookie = login.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await browser.get('/api/users/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('student@test.dev');
    expect(JSON.stringify(me.body)).not.toMatch(/hash|secret/i);
  });

  it('gives the same generic error for a wrong password and an unknown email', async () => {
    await createUser(t, { email: 'student@test.dev', roles: ['student'] });
    const browser = await new Browser(t).open();

    const wrong = await browser.post('/api/auth/login', {
      email: 'student@test.dev',
      password: 'wrong-password',
    });
    const unknown = await browser.post('/api/auth/login', {
      email: 'nobody@test.dev',
      password: 'wrong-password',
    });

    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe('auth.invalidCredentials');
    expect(unknown.status).toBe(401);
    expect(unknown.body.code).toBe('auth.invalidCredentials');
  });

  it('requires a captcha after 3 failures and locks the account after 5', async () => {
    await createUser(t, { email: 'student@test.dev', roles: ['student'] });
    const browser = await new Browser(t).open();
    const attempt = (password: string, captchaToken?: string) =>
      browser.post('/api/auth/login', { email: 'student@test.dev', password, captchaToken });

    for (let i = 0; i < 3; i++) await attempt('wrong-password');
    const noCaptcha = await attempt(PASSWORD);
    expect(noCaptcha.status).toBe(400);
    expect(noCaptcha.body).toMatchObject({ code: 'captcha.required', captchaRequired: true });

    await attempt('wrong-password', VALID_CAPTCHA);
    await attempt('wrong-password', VALID_CAPTCHA);
    const locked = await attempt(PASSWORD, VALID_CAPTCHA);
    expect(locked.status).toBe(429);
    expect(locked.body.code).toBe('auth.locked');
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('signs out on the server', async () => {
    const user = await createUser(t, { email: 'student@test.dev', roles: ['student'] });
    const browser = await signIn(t, user);

    expect((await browser.post('/api/auth/logout')).status).toBe(204);
    expect((await browser.get('/api/users/me')).status).toBe(401);
  });

  it('expires an idle session', async () => {
    const user = await createUser(t, { email: 'student@test.dev', roles: ['student'] });
    const browser = await signIn(t, user);
    await t.prisma.session.updateMany({
      data: { lastSeenAt: new Date(Date.now() - 8 * 24 * 3600 * 1000) },
    });

    expect((await browser.get('/api/users/me')).status).toBe(401);
  });
});

describe('two-step verification (staff)', () => {
  it('forces a staff member to enrol before anything else, then rotates the session', async () => {
    await createUser(t, { email: 'sales@test.dev', roles: ['sales'] });
    const browser = await new Browser(t).open();

    const login = await browser.post('/api/auth/login', {
      email: 'sales@test.dev',
      password: PASSWORD,
    });
    expect(login.body).toEqual({ next: 'totp_setup' });
    const pendingCookie = login.headers['set-cookie']?.[0];

    const blocked = await browser.get('/api/users/me');
    expect(blocked.status).toBe(401);
    expect(blocked.body.code).toBe('auth.mfaRequired');

    const setup = await browser.post('/api/auth/2fa/setup');
    expect(setup.status).toBe(200);
    expect(setup.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    const secret = new URL(setup.body.otpauthUrl as string).searchParams.get('secret')!;

    const enable = await browser.post('/api/auth/2fa/enable', { code: totpCode(secret) });
    expect(enable.status).toBe(200);
    expect(enable.headers['set-cookie']?.[0]).not.toBe(pendingCookie);
    expect((await browser.get('/api/users/me')).body.totpEnabled).toBe(true);
  });

  it('rejects a wrong code and a replayed code', async () => {
    const user = await createUser(t, { email: 'admin@test.dev', roles: ['admin'], withTotp: true });
    await signIn(t, user); // uses the current step's code

    const browser = await new Browser(t).open();
    await browser.post('/api/auth/login', { email: user.email, password: PASSWORD });
    const wrong = await browser.post('/api/auth/2fa/verify', { code: '000000' });
    expect(wrong.body.code).toBe('totp.invalid');
    const replay = await browser.post('/api/auth/2fa/verify', { code: totpCode(user.totpSecret!) });
    expect(replay.body.code).toBe('totp.invalid');
    const next = await browser.post('/api/auth/2fa/verify', {
      code: totpCode(user.totpSecret!, 1),
    });
    expect(next.status).toBe(200);
  });
});

describe('CSRF protection', () => {
  it('refuses a state-changing request without the token or from another origin', async () => {
    await createUser(t, { email: 'student@test.dev', roles: ['student'] });
    const server = t.app.getHttpServer();
    const body = { email: 'student@test.dev', password: PASSWORD };
    const { default: request } = await import('supertest');

    const noToken = await request(server)
      .post('/api/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send(body);
    expect(noToken.status).toBe(403);
    expect(noToken.body.code).toBe('csrf.invalid');

    const browser = await new Browser(t).open();
    const evil = await browser.post('/api/auth/login', body).set('Origin', 'https://evil.example');
    expect(evil.status).toBe(403);
  });
});

describe('forgot and reset password', () => {
  it('answers the same for unknown emails and resets with a single-use link', async () => {
    const user = await createUser(t, { email: 'student@test.dev', roles: ['student'] });
    const oldSession = await signIn(t, user);
    const browser = await new Browser(t).open();

    const unknown = await browser.post('/api/auth/password/forgot', { email: 'nobody@test.dev' });
    const known = await browser.post('/api/auth/password/forgot', { email: user.email });
    expect(unknown.status).toBe(202);
    expect(known.status).toBe(202);
    expect(t.mail.sent).toHaveLength(1);

    const token = t.mail.lastToken('passwordReset');
    const newPassword = 'a-brand-new-long-password';
    const reset = await browser.post('/api/auth/password/reset', { token, password: newPassword });
    expect(reset.status).toBe(204);

    const reuse = await browser.post('/api/auth/password/reset', { token, password: newPassword });
    expect(reuse.body.code).toBe('token.invalid');
    expect((await oldSession.get('/api/users/me')).status).toBe(401);

    const login = await browser.post('/api/auth/login', {
      email: user.email,
      password: newPassword,
    });
    expect(login.status).toBe(200);
  });

  it('rejects a short password with a field error', async () => {
    const browser = await new Browser(t).open();
    const response = await browser.post('/api/auth/password/reset', {
      token: 'a'.repeat(43),
      password: 'short',
    });
    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toEqual({ password: ['password.tooShort'] });
  });
});

describe('invitations', () => {
  it('lets an admin invite a person who then sets a password and signs in', async () => {
    const admin = await createUser(t, {
      email: 'admin@test.dev',
      roles: ['admin'],
      withTotp: true,
    });
    const adminBrowser = await signIn(t, admin);

    const invite = await adminBrowser.post('/api/invitations', {
      email: 'new.student@test.dev',
      firstName: 'Noa',
      lastName: 'Levi',
      roles: ['student'],
      locale: 'he',
    });
    expect(invite.status).toBe(201);
    expect(t.mail.sent[0]?.locale).toBe('he');

    const browser = await new Browser(t).open();
    const accept = await browser.post('/api/invitations/accept', {
      token: t.mail.lastToken('invitation'),
      password: 'my-own-long-password',
    });
    expect(accept.status).toBe(204);

    const login = await browser.post('/api/auth/login', {
      email: 'new.student@test.dev',
      password: 'my-own-long-password',
    });
    expect(login.body).toEqual({ next: 'done' });
  });

  it('forbids non-admins from inviting', async () => {
    const student = await createUser(t, { email: 'student@test.dev', roles: ['student'] });
    const browser = await signIn(t, student);
    const response = await browser.post('/api/invitations', {
      email: 'x@test.dev',
      firstName: 'Some',
      lastName: 'One',
      roles: ['admin'],
    });
    expect(response.status).toBe(403);
  });
});
