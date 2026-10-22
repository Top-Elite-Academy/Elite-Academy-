import { Injectable, type MessageEvent, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { filter, interval, map, merge, type Observable, Subject } from 'rxjs';
import { RedisService } from '../../common/redis/redis.service';

/** Keeps proxies from closing an idle stream. */
const HEARTBEAT_MS = 25_000;

/**
 * Live updates to signed-in browsers (Server-Sent Events). Events go through
 * Redis pub/sub, so they reach the user whichever API instance holds the
 * connection. One subscriber connection per instance serves every stream.
 */
@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis | null = null;
  private readonly events = new Subject<{ userId: string; data: string }>();
  /** The Redis database number keeps test and development events apart. */
  private readonly prefix: string;

  constructor(private readonly redis: RedisService) {
    this.prefix = `eta:${redis.options.db ?? 0}:user:`;
  }

  async onModuleInit(): Promise<void> {
    this.subscriber = this.redis.duplicate();
    this.subscriber.on('pmessage', (_pattern: string, channel: string, data: string) => {
      this.events.next({ userId: channel.slice(this.prefix.length), data });
    });
    await this.subscriber.psubscribe(`${this.prefix}*`);
  }

  async onModuleDestroy(): Promise<void> {
    this.events.complete();
    await this.subscriber?.quit();
  }

  /** Sends an event to every open tab of this user. */
  async publish(userId: string, event: object): Promise<void> {
    await this.redis.publish(`${this.prefix}${userId}`, JSON.stringify(event));
  }

  /** The user's own events, plus a heartbeat. */
  streamFor(userId: string): Observable<MessageEvent> {
    return merge(
      this.events.pipe(
        filter((event) => event.userId === userId),
        map((event): MessageEvent => ({ data: event.data })),
      ),
      interval(HEARTBEAT_MS).pipe(map((): MessageEvent => ({ type: 'ping', data: '' }))),
    );
  }
}
