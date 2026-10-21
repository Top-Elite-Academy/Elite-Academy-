import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfig } from '../../config/app-config';

/** Shared Redis connection for counters and rate limits. */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: AppConfig) {
    super(config.redisUrl, { maxRetriesPerRequest: 3 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
