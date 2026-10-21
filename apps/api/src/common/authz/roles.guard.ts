import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@eta/shared';
import type { Request } from 'express';
import { ApiException } from '../errors/api.exception';
import { REQUIRED_ROLES } from './decorators';

/** Enforces @Roles(...) on the server for every request (spec §9.2). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const roles = context.switchToHttp().getRequest<Request>().auth?.user.roles ?? [];
    if (!required.some((role) => roles.includes(role))) {
      throw ApiException.forbidden();
    }
    return true;
  }
}
