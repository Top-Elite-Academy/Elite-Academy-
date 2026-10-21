import { Injectable } from '@nestjs/common';
import type { ForgotPasswordInput, ResetPasswordInput } from '@eta/shared';
import { CryptoService } from '../../../common/crypto/crypto.service';
import { ApiException } from '../../../common/errors/api.exception';
import type { ClientInfo } from '../../../common/http/client-info';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RateLimiterService } from '../../../common/redis/rate-limiter.service';
import { AppConfig } from '../../../config/app-config';
import { AuditService } from '../../audit/audit.service';
import { MailService } from '../../mail/mail.service';
import { isUsable } from '../../users/user.mapper';
import { AuthTokenService } from './auth-token.service';
import { LoginProtectionService } from './login-protection.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

const HOUR = 60 * 60;
const REQUESTS_PER_IP_PER_HOUR = 5;
const REQUESTS_PER_EMAIL_PER_HOUR = 3;

/** Forgot / reset password (spec §4.1, §9.1). */
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AuthTokenService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly protection: LoginProtectionService,
    private readonly limiter: RateLimiterService,
    private readonly crypto: CryptoService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  /** Always answers the same way, so it never reveals whether an email has an account. */
  async request(input: ForgotPasswordInput, client: ClientInfo): Promise<void> {
    const byIp = await this.limiter.hit(`pwreset:ip:${client.ip}`, REQUESTS_PER_IP_PER_HOUR, HOUR);
    if (!byIp.allowed) throw ApiException.tooManyRequests(byIp.retryAfterSeconds);
    const byEmail = await this.limiter.hit(
      `pwreset:email:${this.crypto.sha256(input.email)}`,
      REQUESTS_PER_EMAIL_PER_HOUR,
      HOUR,
    );
    if (!byEmail.allowed) return;

    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !isUsable(user)) return;

    const ttl = this.config.tokens.passwordResetTtlSeconds;
    const token = await this.tokens.issue(user.id, 'password_reset', ttl);
    await this.mail.send({
      to: user.email,
      locale: user.locale,
      template: 'passwordReset',
      params: {
        firstName: user.firstName,
        // The token sits in the URL fragment: browsers never send it to any server or in Referer.
        link: `${this.config.http.webOrigin}/${user.locale}/reset-password#token=${token}`,
        minutes: Math.round(ttl / 60),
      },
    });
    await this.audit.record({
      actorId: null,
      action: 'auth.passwordReset.requested',
      entity: 'user',
      entityId: user.id,
      client,
    });
  }

  async reset(input: ResetPasswordInput, client: ClientInfo): Promise<void> {
    // Check the new password first, so a rejected password does not burn the link.
    await this.passwords.assertAcceptable(input.password);
    const userId = await this.tokens.consume(input.token, 'password_reset');
    if (!userId) throw ApiException.badRequest('token.invalid');

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwords.hash(input.password) },
    });
    await this.sessions.revokeAllForUser(userId);
    await this.protection.clearAccount(user.email);
    await this.audit.record({
      actorId: userId,
      action: 'auth.passwordReset.completed',
      entity: 'user',
      entityId: userId,
      client,
    });
  }
}
