import { Injectable } from '@nestjs/common';
import { isStaff, type Role } from '@eta/shared';
import type { AuthContext } from '../../../common/authz/auth-context';
import { CryptoService } from '../../../common/crypto/crypto.service';
import type { ClientInfo } from '../../../common/http/client-info';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AppConfig } from '../../../config/app-config';
import { AUTH_USER_SELECT, isUsable, toAuthUser } from '../../users/user.mapper';

/** Only write "last seen" once a minute, not on every request. */
const TOUCH_INTERVAL_MS = 60_000;

/**
 * Server-side sessions (spec §9.1). The cookie carries a random token; the
 * database stores only its hash, so sessions can be revoked at any time.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: AppConfig,
  ) {}

  async create(
    user: { id: string; roles: Role[] },
    options: { mfaVerified: boolean; client: ClientInfo },
  ): Promise<string> {
    const { staffIdleSeconds, studentIdleSeconds, absoluteSeconds } = this.config.session;
    const token = this.crypto.randomToken();
    await this.prisma.session.create({
      data: {
        tokenHash: this.crypto.sha256(token),
        userId: user.id,
        mfaVerified: options.mfaVerified,
        // People with any staff role get the stricter staff timeout.
        idleTimeoutSec: isStaff(user.roles) ? staffIdleSeconds : studentIdleSeconds,
        absoluteExpiresAt: new Date(Date.now() + absoluteSeconds * 1000),
        ip: options.client.ip,
        userAgent: options.client.userAgent,
      },
    });
    return token;
  }

  /** Returns the session for a cookie token, or null if missing, expired, revoked or the user is disabled. */
  async validate(token: string | undefined): Promise<AuthContext | null> {
    if (!token) return null;
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.crypto.sha256(token) },
      include: { user: { select: AUTH_USER_SELECT } },
    });
    if (!session || session.revokedAt || !isUsable(session.user)) return null;

    const now = Date.now();
    const idleExpired = session.lastSeenAt.getTime() + session.idleTimeoutSec * 1000 < now;
    if (idleExpired || session.absoluteExpiresAt.getTime() < now) {
      await this.revoke(session.id);
      return null;
    }
    if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }
    return {
      sessionId: session.id,
      mfaVerified: session.mfaVerified,
      user: toAuthUser(session.user),
    };
  }

  /**
   * Gives the session a brand-new token (spec §9.1: rotate on privilege change),
   * e.g. after the two-step code is accepted. The old cookie stops working.
   */
  async rotate(sessionId: string, changes: { mfaVerified?: boolean } = {}): Promise<string> {
    const token = this.crypto.randomToken();
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { tokenHash: this.crypto.sha256(token), lastSeenAt: new Date(), ...changes },
    });
    return token;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByToken(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: this.crypto.sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** "Sign out of all devices", password reset, role change. */
  async revokeAllForUser(userId: string): Promise<number> {
    const { count } = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return count;
  }
}
