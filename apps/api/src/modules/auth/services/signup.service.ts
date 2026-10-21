import { Injectable } from '@nestjs/common';
import type { SignupInput } from '@eta/shared';
import { ApiException } from '../../../common/errors/api.exception';
import type { ClientInfo } from '../../../common/http/client-info';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RateLimiterService } from '../../../common/redis/rate-limiter.service';
import { AuditService } from '../../audit/audit.service';
import { CaptchaService } from './captcha.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

const SIGNUPS_PER_IP_PER_HOUR = 5;

/**
 * Student account created at booking time (spec §3.7: "sign-in or account
 * creation is required before payment"). Staff accounts stay invitation-only.
 * Protected like every public form (spec §9.4): rate limit + captcha.
 */
@Injectable()
export class SignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly limiter: RateLimiterService,
    private readonly captcha: CaptchaService,
    private readonly audit: AuditService,
  ) {}

  /** Creates the student and signs them in. Returns the new session token. */
  async signup(input: SignupInput, client: ClientInfo): Promise<string> {
    const rate = await this.limiter.hit(`signup:ip:${client.ip}`, SIGNUPS_PER_IP_PER_HOUR, 3600);
    if (!rate.allowed) throw ApiException.tooManyRequests(rate.retryAfterSeconds);
    if (!(await this.captcha.verify(input.captchaToken, client.ip))) {
      throw ApiException.badRequest('captcha.required', { captchaRequired: true });
    }
    await this.passwords.assertAcceptable(input.password);
    if (await this.prisma.user.findUnique({ where: { email: input.email } })) {
      throw ApiException.conflict('user.exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        locale: input.locale,
        passwordHash: await this.passwords.hash(input.password),
        status: 'active',
        lastLoginAt: new Date(),
        roles: { create: [{ role: 'student' }] },
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'user.signedUp',
      entity: 'user',
      entityId: user.id,
      client,
    });
    // Students need no second step (spec §9.1: 2FA is optional for students).
    return this.sessions.create({ id: user.id, roles: ['student'] }, { mfaVerified: true, client });
  }
}
