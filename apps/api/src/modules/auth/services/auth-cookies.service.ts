import { Injectable } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { CryptoService } from '../../../common/crypto/crypto.service';
import { AppConfig } from '../../../config/app-config';

/** Sets and reads the session and CSRF cookies with the attributes required by spec §9.1. */
@Injectable()
export class AuthCookiesService {
  constructor(
    private readonly config: AppConfig,
    private readonly crypto: CryptoService,
  ) {}

  readSession(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string | undefined>;
    return cookies[this.config.session.cookieName];
  }

  setSession(response: Response, token: string): void {
    response.cookie(this.config.session.cookieName, token, {
      ...this.baseOptions(),
      httpOnly: true,
      sameSite: 'lax',
      maxAge: this.config.session.absoluteSeconds * 1000,
    });
  }

  clearSession(response: Response): void {
    response.clearCookie(this.config.session.cookieName, {
      ...this.baseOptions(),
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  /** Double-submit CSRF token: readable by our own scripts, never sent cross-site. */
  ensureCsrf(request: Request, response: Response): string {
    const cookies = request.cookies as Record<string, string | undefined>;
    const existing = cookies[this.config.session.csrfCookieName];
    if (existing && /^[A-Za-z0-9_-]{43}$/.test(existing)) return existing;
    const token = this.crypto.randomToken();
    response.cookie(this.config.session.csrfCookieName, token, {
      ...this.baseOptions(),
      httpOnly: false,
      sameSite: 'strict',
    });
    return token;
  }

  private baseOptions(): CookieOptions {
    return { secure: this.config.session.secureCookies, path: '/' };
  }
}
