import type { Role } from '@eta/shared';
import { Secret, TOTP } from 'otpauth';
import request from 'supertest';
import type { TestApp } from './test-app';

export const WEB_ORIGIN = 'http://localhost:3000';
export const PASSWORD = 'correct-horse-battery-staple';

/**
 * Behaves like the web app in a browser: keeps cookies, fetches the CSRF
 * token, and sends Origin + X-CSRF-Token on every state-changing request.
 */
export class Browser {
  private readonly agent;
  private csrfToken = '';

  constructor(testApp: TestApp) {
    this.agent = request.agent(testApp.app.getHttpServer());
  }

  async open(): Promise<this> {
    const response = await this.agent.get('/api/auth/csrf');
    this.csrfToken = (response.body as { csrfToken: string }).csrfToken;
    return this;
  }

  get(path: string) {
    return this.agent.get(path);
  }

  post(path: string, body: object = {}) {
    return this.agent
      .post(path)
      .set('Origin', WEB_ORIGIN)
      .set('X-CSRF-Token', this.csrfToken)
      .send(body);
  }

  put(path: string, body: object = {}) {
    return this.agent
      .put(path)
      .set('Origin', WEB_ORIGIN)
      .set('X-CSRF-Token', this.csrfToken)
      .send(body);
  }

  /** A multipart upload: one file plus text fields. */
  upload(
    path: string,
    file: { name: string; content: Buffer | string },
    fields: Record<string, string> = {},
  ) {
    let request = this.agent
      .post(path)
      .set('Origin', WEB_ORIGIN)
      .set('X-CSRF-Token', this.csrfToken);
    for (const [name, value] of Object.entries(fields)) request = request.field(name, value);
    return request.attach('file', Buffer.from(file.content), file.name);
  }

  /** A multipart form with any number of files under one field name (none is fine too). */
  multipart(
    path: string,
    field: string,
    files: { name: string; content: Buffer | string }[],
    fields: Record<string, string> = {},
  ) {
    let request = this.agent
      .post(path)
      .set('Origin', WEB_ORIGIN)
      .set('X-CSRF-Token', this.csrfToken);
    for (const [name, value] of Object.entries(fields)) request = request.field(name, value);
    for (const file of files) request = request.attach(field, Buffer.from(file.content), file.name);
    return request;
  }

  /** A raw body (e.g. a video file) sent with PUT. */
  putRaw(path: string, body: Buffer, contentType: string) {
    return this.agent
      .put(path)
      .set('Origin', WEB_ORIGIN)
      .set('X-CSRF-Token', this.csrfToken)
      .set('Content-Type', contentType)
      .send(body);
  }

  /**
   * Starts a raw PUT that announces `declaredBytes` but drops the connection
   * after a few bytes, like a browser tab closed in the middle of an upload.
   */
  async abortedPut(path: string, declaredBytes: number, contentType: string): Promise<void> {
    const request = this.agent
      .put(path)
      .set('Origin', WEB_ORIGIN)
      .set('X-CSRF-Token', this.csrfToken)
      .set('Content-Type', contentType)
      .set('Content-Length', String(declaredBytes));
    request.on('error', () => undefined);
    request.write(Buffer.from('fake'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    request.abort();
    // Let the server notice the dropped connection.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  delete(path: string) {
    return this.agent.delete(path).set('Origin', WEB_ORIGIN).set('X-CSRF-Token', this.csrfToken);
  }

  patch(path: string, body: object = {}) {
    return this.agent
      .patch(path)
      .set('Origin', WEB_ORIGIN)
      .set('X-CSRF-Token', this.csrfToken)
      .send(body);
  }
}

/** A 6-digit code; `stepOffset` lets a test use the next 30-second step (codes are single-use). */
export function totpCode(base32Secret: string, stepOffset = 0): string {
  const totp = new TOTP({ secret: Secret.fromBase32(base32Secret), digits: 6, period: 30 });
  return totp.generate({ timestamp: Date.now() + stepOffset * 30_000 });
}

export interface TestUser {
  id: string;
  email: string;
  totpSecret?: string;
}

/** Inserts an active user directly. With `withTotp`, two-step verification is already enrolled. */
export async function createUser(
  t: TestApp,
  options: { email: string; roles: Role[]; withTotp?: boolean },
): Promise<TestUser> {
  const totpSecret = options.withTotp ? new Secret({ size: 20 }).base32 : undefined;
  const user = await t.prisma.user.create({
    data: {
      email: options.email,
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      passwordHash: await t.passwords.hash(PASSWORD),
      totpSecretEnc: totpSecret ? t.crypto.encrypt(totpSecret) : null,
      totpEnabledAt: totpSecret ? new Date() : null,
      roles: { create: options.roles.map((role) => ({ role })) },
    },
  });
  return { id: user.id, email: user.email, totpSecret };
}

/** Full sign-in, including the TOTP step for enrolled users. */
export async function signIn(t: TestApp, user: TestUser): Promise<Browser> {
  const browser = await new Browser(t).open();
  const login = await browser.post('/api/auth/login', { email: user.email, password: PASSWORD });
  if (login.status !== 200) throw new Error(`Login failed: ${JSON.stringify(login.body)}`);
  if (user.totpSecret) {
    const verify = await browser.post('/api/auth/2fa/verify', { code: totpCode(user.totpSecret) });
    if (verify.status !== 200) throw new Error(`2FA failed: ${JSON.stringify(verify.body)}`);
  }
  return browser;
}
