import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window counters in Redis. Shared by the global API limit, the login
 * protection and the form limits, so the logic lives in one place.
 */
@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  /** Counts one hit for `key`; allowed while the count stays within `limit` per `windowSeconds`. */
  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const redisKey = `rl:${key}`;
    const result = await this.redis
      .multi()
      .incr(redisKey)
      .expire(redisKey, windowSeconds, 'NX')
      .ttl(redisKey)
      .exec();
    const count = Number(result?.[0]?.[1] ?? 0);
    const ttl = Number(result?.[2]?.[1] ?? windowSeconds);
    return { allowed: count <= limit, count, retryAfterSeconds: Math.max(ttl, 1) };
  }

  async count(key: string): Promise<number> {
    return Number((await this.redis.get(`rl:${key}`)) ?? 0);
  }

  /** Sets a flag that expires by itself, e.g. a temporary lock. */
  async block(key: string, seconds: number): Promise<void> {
    await this.redis.set(`rl:${key}`, '1', 'EX', seconds);
  }

  /** Seconds until the key expires; 0 if it does not exist. */
  async ttl(key: string): Promise<number> {
    return Math.max(await this.redis.ttl(`rl:${key}`), 0);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`rl:${key}`);
  }
}
