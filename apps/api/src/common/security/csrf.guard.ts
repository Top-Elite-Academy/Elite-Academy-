import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppConfig } from '../../config/app-config';
import { CryptoService } from '../crypto/crypto.service';
import { SKIP_CSRF } from '../authz/decorators';
import { ApiException } from '../errors/api.exception';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-csrf-token';

/**
 * CSRF protection for every state-changing request (spec §9.3), on top of SameSite cookies:
 * 1. the Origin (or Referer) must be our website;
 * 2. double-submit token: the X-CSRF-Token header must equal the CSRF cookie.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfig,
    private readonly crypto: CryptoService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;
    if (
      this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    if (!this.hasTrustedOrigin(request) || !this.hasMatchingToken(request)) {
      throw ApiException.forbidden('csrf.invalid');
    }
    return true;
  }

  private hasTrustedOrigin(request: Request): boolean {
    const expected = this.config.http.webOrigin;
    const origin = request.get('origin');
    if (origin) return origin === expected;
    const referer = request.get('referer');
    return referer !== undefined && (referer === expected || referer.startsWith(`${expected}/`));
  }

  private hasMatchingToken(request: Request): boolean {
    const header = request.get(CSRF_HEADER);
    const cookies = request.cookies as Record<string, string | undefined>;
    const cookie = cookies[this.config.session.csrfCookieName];
    return Boolean(header && cookie && this.crypto.safeEqual(header, cookie));
  }
}
