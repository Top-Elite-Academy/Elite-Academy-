import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfig } from '../../config/app-config';
import { clientInfoOf } from '../http/client-info';
import { ApiException } from '../errors/api.exception';
import { RateLimiterService } from '../redis/rate-limiter.service';

const WINDOW_SECONDS = 60;

/** Runs first: limits every caller by IP (spec §9.4, e.g. 100 requests/minute). */
@Injectable()
export class IpRateLimitGuard implements CanActivate {
  constructor(
    private readonly limiter: RateLimiterService,
    private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { ip } = clientInfoOf(context.switchToHttp().getRequest<Request>());
    const result = await this.limiter.hit(
      `api:ip:${ip}`,
      this.config.http.rateLimitPerMinute,
      WINDOW_SECONDS,
    );
    if (!result.allowed) throw ApiException.tooManyRequests(result.retryAfterSeconds);
    return true;
  }
}

/** Runs after the session guard: limits each signed-in user, whatever IP they use. */
@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(
    private readonly limiter: RateLimiterService,
    private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = context.switchToHttp().getRequest<Request>().auth?.user.id;
    if (!userId) return true;
    const result = await this.limiter.hit(
      `api:user:${userId}`,
      this.config.http.rateLimitPerMinute,
      WINDOW_SECONDS,
    );
    if (!result.allowed) throw ApiException.tooManyRequests(result.retryAfterSeconds);
    return true;
  }
}
