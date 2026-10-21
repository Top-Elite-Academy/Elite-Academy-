import { Injectable } from '@nestjs/common';
import type { TotpSetupResponse } from '@eta/shared';
import type { AuthContext } from '../../../common/authz/auth-context';
import { ApiException } from '../../../common/errors/api.exception';
import type { ClientInfo } from '../../../common/http/client-info';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RateLimiterService } from '../../../common/redis/rate-limiter.service';
import { AuditService } from '../../audit/audit.service';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TotpService } from './totp.service';

/** Wrong codes allowed per session before it is ended and the user must start again. */
const MAX_CODE_FAILURES = 5;

/** Step 2 of sign-in: TOTP enrolment and verification (spec §9.1, mandatory for staff). */
@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totp: TotpService,
    private readonly sessions: SessionService,
    private readonly limiter: RateLimiterService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  /** Creates a pending secret and returns the QR code. Enabled only after a correct code. */
  async startSetup(auth: AuthContext): Promise<TotpSetupResponse> {
    if (auth.user.totpEnabled) throw ApiException.conflict('totp.alreadyEnabled');
    const secret = this.totp.createEncryptedSecret();
    await this.prisma.user.update({ where: { id: auth.user.id }, data: { totpSecretEnc: secret } });
    return this.totp.enrolmentDetails(secret, auth.user.email);
  }

  /** Confirms enrolment with a first code. Returns the rotated session token. */
  async enable(auth: AuthContext, code: string, client: ClientInfo): Promise<string> {
    if (auth.user.totpEnabled) throw ApiException.conflict('totp.alreadyEnabled');
    const secret = await this.secretOf(auth.user.id);
    if (!secret.totpSecretEnc) throw ApiException.badRequest('totp.setupFirst');

    const step = await this.checkCode(auth, secret.totpSecretEnc, code, secret.totpLastStep);
    await this.prisma.user.update({
      where: { id: auth.user.id },
      data: { totpEnabledAt: new Date(), totpLastStep: step },
    });
    await this.audit.record({
      actorId: auth.user.id,
      action: 'auth.totp.enabled',
      entity: 'user',
      entityId: auth.user.id,
      client,
    });
    return this.finishStep(auth, client);
  }

  /** Checks the code of an enrolled user. Returns the rotated session token. */
  async verify(auth: AuthContext, code: string, client: ClientInfo): Promise<string> {
    const secret = await this.secretOf(auth.user.id);
    if (!secret.totpEnabledAt || !secret.totpSecretEnc)
      throw ApiException.badRequest('totp.notEnabled');

    const step = await this.checkCode(auth, secret.totpSecretEnc, code, secret.totpLastStep);
    await this.prisma.user.update({ where: { id: auth.user.id }, data: { totpLastStep: step } });
    return this.finishStep(auth, client);
  }

  private async checkCode(
    auth: AuthContext,
    encryptedSecret: string,
    code: string,
    lastStep: number | null,
  ): Promise<number> {
    const step = this.totp.verify(encryptedSecret, code, lastStep);
    if (step !== null) return step;

    const failures = await this.limiter.hit(
      `totp:fail:${auth.sessionId}`,
      MAX_CODE_FAILURES,
      15 * 60,
    );
    if (!failures.allowed) {
      await this.sessions.revoke(auth.sessionId);
      throw ApiException.unauthorized('totp.tooManyAttempts');
    }
    throw ApiException.badRequest('totp.invalid');
  }

  private async finishStep(auth: AuthContext, client: ClientInfo): Promise<string> {
    const token = await this.sessions.rotate(auth.sessionId, { mfaVerified: true });
    if (!auth.mfaVerified) await this.auth.completeSignIn(auth.user.id, client);
    return token;
  }

  private secretOf(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { totpSecretEnc: true, totpEnabledAt: true, totpLastStep: true },
    });
  }
}
