import { Injectable } from '@nestjs/common';
import { CryptoService } from '../../../common/crypto/crypto.service';
import { RateLimiterService } from '../../../common/redis/rate-limiter.service';
import { AppConfig } from '../../../config/app-config';

const IP_WINDOW_SECONDS = 60 * 60;
/** Failures an IP may make before it is slowed down (schools and offices share IPs). */
const IP_FREE_FAILURES = 10;
const IP_MAX_BLOCK_SECONDS = 15 * 60;

export interface LoginGate {
  blockedForSeconds: number;
  captchaRequired: boolean;
}

/**
 * Brute-force protection for sign-in (spec §9.1):
 * - per account: N failures → locked for M minutes;
 * - per IP: growing block after repeated failures;
 * - captcha after a few failures.
 * Counters are keyed by a hash of the typed email, whether or not the account
 * exists, so the lock itself never reveals which emails are registered.
 */
@Injectable()
export class LoginProtectionService {
  constructor(
    private readonly limiter: RateLimiterService,
    private readonly crypto: CryptoService,
    private readonly config: AppConfig,
  ) {}

  async check(email: string, ip: string): Promise<LoginGate> {
    const { captchaAfterFailures } = this.config.loginProtection;
    const [accountLock, ipBlock, accountFailures, ipFailures] = await Promise.all([
      this.limiter.ttl(this.keys(email, ip).accountLock),
      this.limiter.ttl(this.keys(email, ip).ipBlock),
      this.limiter.count(this.keys(email, ip).accountFailures),
      this.limiter.count(this.keys(email, ip).ipFailures),
    ]);
    return {
      blockedForSeconds: Math.max(accountLock, ipBlock, 0),
      captchaRequired: Math.max(accountFailures, ipFailures) >= captchaAfterFailures,
    };
  }

  async recordFailure(email: string, ip: string): Promise<void> {
    const { maxFailures, lockSeconds } = this.config.loginProtection;
    const keys = this.keys(email, ip);

    const account = await this.limiter.hit(keys.accountFailures, maxFailures, lockSeconds);
    if (account.count >= maxFailures) {
      await this.limiter.block(keys.accountLock, lockSeconds);
      await this.limiter.reset(keys.accountFailures);
    }

    const byIp = await this.limiter.hit(keys.ipFailures, IP_FREE_FAILURES, IP_WINDOW_SECONDS);
    if (!byIp.allowed) {
      const growing = 2 ** Math.min(byIp.count - IP_FREE_FAILURES, 10);
      await this.limiter.block(keys.ipBlock, Math.min(growing, IP_MAX_BLOCK_SECONDS));
    }
  }

  /** A successful sign-in clears the account counters (the IP history stays). */
  async recordSuccess(email: string, ip: string): Promise<void> {
    const keys = this.keys(email, ip);
    await Promise.all([
      this.limiter.reset(keys.accountFailures),
      this.limiter.reset(keys.accountLock),
    ]);
  }

  /** After a password reset the owner proved control of the email: unlock the account. */
  async clearAccount(email: string): Promise<void> {
    await this.recordSuccess(email, 'n/a');
  }

  private keys(email: string, ip: string) {
    const account = this.crypto.sha256(email.toLowerCase());
    return {
      accountFailures: `login:fail:acct:${account}`,
      accountLock: `login:lock:acct:${account}`,
      ipFailures: `login:fail:ip:${ip}`,
      ipBlock: `login:lock:ip:${ip}`,
    };
  }
}
