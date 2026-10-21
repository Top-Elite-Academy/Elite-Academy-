import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { ALLOW_PENDING_MFA, IS_PUBLIC } from '../../common/authz/decorators';
import { ApiException } from '../../common/errors/api.exception';
import { AuthCookiesService } from './services/auth-cookies.service';
import { SessionService } from './services/session.service';

/**
 * Deny by default: every route needs a valid session unless marked @Public().
 * A session that has passed only the password step can reach @AllowPendingMfa() routes only.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly cookies: AuthCookiesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const auth = await this.sessions.validate(this.cookies.readSession(request));
    if (!auth) {
      this.cookies.clearSession(http.getResponse<Response>());
      throw ApiException.unauthorized();
    }
    if (
      !auth.mfaVerified &&
      !this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_MFA, targets)
    ) {
      throw ApiException.unauthorized('auth.mfaRequired');
    }
    request.auth = auth;
    return true;
  }
}
