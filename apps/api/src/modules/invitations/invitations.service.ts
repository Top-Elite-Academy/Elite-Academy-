import { Injectable } from '@nestjs/common';
import type { AcceptInvitationInput, CreateInvitationInput } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/app-config';
import { AuditService } from '../audit/audit.service';
import { AuthTokenService } from '../auth/services/auth-token.service';
import { PasswordService } from '../auth/services/password.service';
import { MailService } from '../mail/mail.service';

/** Sign-up is by invitation only (spec §4: accounts are created by staff). */
@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AuthTokenService,
    private readonly passwords: PasswordService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  async create(
    input: CreateInvitationInput,
    actor: AuthUser,
    client: ClientInfo,
  ): Promise<{ id: string }> {
    const exists = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw ApiException.conflict('user.exists');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        locale: input.locale,
        status: 'invited',
        roles: { create: input.roles.map((role) => ({ role })) },
      },
    });
    const ttl = this.config.tokens.invitationTtlSeconds;
    const token = await this.tokens.issue(user.id, 'invitation', ttl);
    await this.mail.send({
      to: user.email,
      locale: user.locale,
      template: 'invitation',
      params: {
        firstName: user.firstName,
        link: `${this.config.http.webOrigin}/${user.locale}/invite#token=${token}`,
        hours: Math.round(ttl / 3600),
      },
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'user.invited',
      entity: 'user',
      entityId: user.id,
      after: { email: user.email, roles: input.roles },
      client,
    });
    return { id: user.id };
  }

  async accept(input: AcceptInvitationInput, client: ClientInfo): Promise<void> {
    await this.passwords.assertAcceptable(input.password);
    const userId = await this.tokens.consume(input.token, 'invitation');
    if (!userId) throw ApiException.badRequest('token.invalid');

    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, status: 'invited', deletedAt: null },
      data: { passwordHash: await this.passwords.hash(input.password), status: 'active' },
    });
    if (count !== 1) throw ApiException.badRequest('token.invalid');

    await this.audit.record({
      actorId: userId,
      action: 'user.invitation.accepted',
      entity: 'user',
      entityId: userId,
      client,
    });
  }
}
