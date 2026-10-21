import { Injectable } from '@nestjs/common';
import { isStaff, type LoginInput, type LoginResponse } from '@eta/shared';
import type { AuthContext } from '../../../common/authz/auth-context';
import { ApiException } from '../../../common/errors/api.exception';
import type { ClientInfo } from '../../../common/http/client-info';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AUTH_USER_SELECT, isUsable, toAuthUser } from '../../users/user.mapper';
import { CaptchaService } from './captcha.service';
import { LoginProtectionService } from './login-protection.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

export interface SignInStep {
  /** New session token to put in the cookie. */
  token: string;
  next: LoginResponse['next'];
}

/** Step 1 of sign-in (email + password) and sign-out. Step 2 lives in TwoFactorService. */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly protection: LoginProtectionService,
    private readonly captcha: CaptchaService,
    private readonly audit: AuditService,
  ) {}

  async login(input: LoginInput, client: ClientInfo, previousToken?: string): Promise<SignInStep> {
    await this.assertMayTry(input, client);

    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { ...AUTH_USER_SELECT, passwordHash: true },
    });
    // Always run the hash check, even for unknown emails, so timing reveals nothing.
    const passwordOk = await this.passwords.verify(user?.passwordHash ?? null, input.password);
    if (!user || !passwordOk || !isUsable(user)) {
      return this.rejectLogin(input.email, client, user?.id ?? null);
    }
    const authUser = toAuthUser(user);
    await this.protection.recordSuccess(input.email, client.ip);

    // Never reuse a session that existed before sign-in (session fixation).
    if (previousToken) await this.sessions.revokeByToken(previousToken);

    const needsSecondStep = isStaff(authUser.roles) || authUser.totpEnabled;
    const token = await this.sessions.create(authUser, { mfaVerified: !needsSecondStep, client });
    if (!needsSecondStep) {
      await this.completeSignIn(authUser.id, client);
      return { token, next: 'done' };
    }
    return { token, next: authUser.totpEnabled ? 'totp_verify' : 'totp_setup' };
  }

  /** Called once every required step is passed. */
  async completeSignIn(userId: string, client: ClientInfo): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    await this.audit.record({
      actorId: userId,
      action: 'auth.login.succeeded',
      entity: 'user',
      entityId: userId,
      client,
    });
  }

  /** Drops a session that existed before signing up (no session fixation). */
  async revokeSessionToken(token: string): Promise<void> {
    await this.sessions.revokeByToken(token);
  }

  async logout(auth: AuthContext, client: ClientInfo): Promise<void> {
    await this.sessions.revoke(auth.sessionId);
    await this.audit.record({
      actorId: auth.user.id,
      action: 'auth.logout',
      entity: 'session',
      entityId: auth.sessionId,
      client,
    });
  }

  async logoutEverywhere(auth: AuthContext, client: ClientInfo): Promise<void> {
    const count = await this.sessions.revokeAllForUser(auth.user.id);
    await this.audit.record({
      actorId: auth.user.id,
      action: 'auth.logout.allDevices',
      entity: 'user',
      entityId: auth.user.id,
      after: { revokedSessions: count },
      client,
    });
  }

  private async assertMayTry(input: LoginInput, client: ClientInfo): Promise<void> {
    const gate = await this.protection.check(input.email, client.ip);
    if (gate.blockedForSeconds > 0) {
      throw ApiException.tooManyRequests(gate.blockedForSeconds, 'auth.locked');
    }
    if (gate.captchaRequired && !(await this.captcha.verify(input.captchaToken, client.ip))) {
      throw ApiException.badRequest('captcha.required', { captchaRequired: true });
    }
  }

  /** One generic message for every failure (spec §9.1: "Email or password is incorrect"). */
  private async rejectLogin(
    email: string,
    client: ClientInfo,
    userId: string | null,
  ): Promise<never> {
    await this.protection.recordFailure(email, client.ip);
    await this.audit.record({
      actorId: null,
      action: 'auth.login.failed',
      entity: 'user',
      entityId: userId,
      client,
    });
    const gate = await this.protection.check(email, client.ip);
    throw ApiException.unauthorized('auth.invalidCredentials', {
      captchaRequired: gate.captchaRequired,
    });
  }
}
