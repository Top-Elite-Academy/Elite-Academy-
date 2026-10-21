import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@eta/shared';
import type { Request } from 'express';
import { ApiException } from '../errors/api.exception';
import type { AuthContext, AuthUser } from './auth-context';

export const IS_PUBLIC = 'auth:isPublic';
export const ALLOW_PENDING_MFA = 'auth:allowPendingMfa';
export const REQUIRED_ROLES = 'auth:roles';
export const SKIP_CSRF = 'security:skipCsrf';

/** Route needs no session. Everything else requires sign-in by default (deny by default). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Route is reachable after the password step but before the two-step code (2FA endpoints only). */
export const AllowPendingMfa = () => SetMetadata(ALLOW_PENDING_MFA, true);

/** Caller must hold at least one of these roles. */
export const Roles = (...roles: Role[]) => SetMetadata(REQUIRED_ROLES, roles);

/** Only for server-to-server calls that cannot carry a CSRF token (e.g. signed webhooks). */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF, true);

function authOf(context: ExecutionContext): AuthContext {
  const auth = context.switchToHttp().getRequest<Request>().auth;
  if (!auth) throw ApiException.unauthorized();
  return auth;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => authOf(context).user,
);

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext => authOf(context),
);
