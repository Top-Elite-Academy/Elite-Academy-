import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { ApiException } from '../../../common/errors/api.exception';
import { BreachedPasswordService } from './breached-password.service';

/** OWASP Password Storage Cheat Sheet: Argon2id, m=19 MiB, t=2, p=1. */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Hashing and policy for passwords (spec §9.1). Passwords are never logged or stored in clear. */
@Injectable()
export class PasswordService {
  /** Compared against when the email is unknown, so response time does not reveal accounts. */
  private readonly dummyHash: Promise<string>;

  constructor(private readonly breached: BreachedPasswordService) {
    this.dummyHash = argon2.hash('dummy-password-for-timing', ARGON2_OPTIONS);
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string | null, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash ?? (await this.dummyHash), password);
    } catch {
      return false;
    }
  }

  /** Length is checked by the shared Zod schema; this adds the breached-password check. */
  async assertAcceptable(password: string): Promise<void> {
    if (await this.breached.isBreached(password)) {
      throw ApiException.badRequest('password.breached');
    }
  }
}
