import type { Prisma } from '@eta/db';
import type { MeResponse } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';

/** The user columns loaded with every authenticated request. */
export const AUTH_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  locale: true,
  timeZone: true,
  totpEnabledAt: true,
  status: true,
  deletedAt: true,
  roles: { select: { role: true } },
} satisfies Prisma.UserSelect;

export type AuthUserRecord = Prisma.UserGetPayload<{ select: typeof AUTH_USER_SELECT }>;

export function toAuthUser(record: AuthUserRecord): AuthUser {
  return {
    id: record.id,
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
    roles: record.roles.map(({ role }) => role),
    locale: record.locale,
    timeZone: record.timeZone,
    totpEnabled: record.totpEnabledAt !== null,
  };
}

/** Explicit allow-list of what the client may see about itself. */
export function toMeResponse(user: AuthUser): MeResponse {
  const { id, email, firstName, lastName, roles, locale, timeZone, totpEnabled } = user;
  return { id, email, firstName, lastName, roles, locale, timeZone, totpEnabled };
}

export function isUsable(record: Pick<AuthUserRecord, 'status' | 'deletedAt'>): boolean {
  return record.status === 'active' && record.deletedAt === null;
}
