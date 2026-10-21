import { Injectable } from '@nestjs/common';
import type { AuthTokenType } from '@eta/db';
import { CryptoService } from '../../../common/crypto/crypto.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

/** Single-use links (invitation, password reset). Stored hashed; spec §9.1. */
@Injectable()
export class AuthTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /** Issues a new token and cancels any earlier unused one of the same type. */
  async issue(userId: string, type: AuthTokenType, ttlSeconds: number): Promise<string> {
    const token = this.crypto.randomToken();
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.authToken.updateMany({
        where: { userId, type, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.authToken.create({
        data: {
          userId,
          type,
          tokenHash: this.crypto.sha256(token),
          expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
        },
      }),
    ]);
    return token;
  }

  /**
   * Marks the token used and returns its user id, or null if it is unknown,
   * expired or already used. The conditional update makes double use impossible.
   */
  async consume(token: string, type: AuthTokenType): Promise<string | null> {
    const tokenHash = this.crypto.sha256(token);
    const now = new Date();
    const { count } = await this.prisma.authToken.updateMany({
      where: { tokenHash, type, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count !== 1) return null;
    const record = await this.prisma.authToken.findUnique({ where: { tokenHash } });
    return record?.userId ?? null;
  }
}
