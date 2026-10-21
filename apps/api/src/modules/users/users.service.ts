import { Injectable } from '@nestjs/common';
import type { MeResponse, UpdateMyPreferencesInput } from '@eta/shared';
import { AccessPolicy } from '../../common/authz/access-policy';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUTH_USER_SELECT, toAuthUser, toMeResponse } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Language and time zone only — the schema rejects any other field (no mass assignment). */
  async updatePreferences(
    actor: AuthUser,
    input: UpdateMyPreferencesInput,
    client: ClientInfo,
  ): Promise<MeResponse> {
    const updated = await this.prisma.user.update({
      where: { id: actor.id },
      data: input,
      select: AUTH_USER_SELECT,
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'user.preferences.updated',
      entity: 'user',
      entityId: actor.id,
      before: { locale: actor.locale, timeZone: actor.timeZone },
      after: input,
      client,
    });
    return toMeResponse(toAuthUser(updated));
  }

  /** A user's profile: the user themself or an admin; anyone else gets 404. */
  async findVisibleTo(actor: AuthUser, userId: string): Promise<MeResponse> {
    AccessPolicy.assertCanAccessUserRecord(actor, userId);
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: AUTH_USER_SELECT,
    });
    if (!user) throw ApiException.notFound();
    return toMeResponse(toAuthUser(user));
  }
}
