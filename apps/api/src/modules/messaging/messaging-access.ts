import type { ConversationKind, Prisma, Role } from '@eta/db';
import type { AuthUser } from '../../common/authz/auth-context';

/**
 * Who answers the team threads. Support: admins. Payments: admins and sales.
 * (Students never message other students; staff talk to students only.)
 */
export const TEAM_ROLES: Record<Exclude<ConversationKind, 'direct'>, Role[]> = {
  support: ['admin'],
  payments: ['admin', 'sales'],
};

/** The teams this user answers for. */
export function teamsOf(user: AuthUser): Exclude<ConversationKind, 'direct'>[] {
  return (Object.keys(TEAM_ROLES) as Exclude<ConversationKind, 'direct'>[]).filter((team) =>
    TEAM_ROLES[team].some((role) => user.roles.includes(role)),
  );
}

/** Threads the user takes part in: their own, as student or staff, plus their teams' inboxes. */
export function threadScope(user: AuthUser): Prisma.ConversationWhereInput {
  const teams = teamsOf(user);
  return {
    OR: [
      { studentId: user.id },
      { staffId: user.id },
      ...(teams.length ? [{ kind: { in: teams } }] : []),
    ],
  };
}

/** The user sees the thread as its student (not as staff or team member). */
export const isStudentSide = (user: AuthUser, conversation: { studentId: string }) =>
  conversation.studentId === user.id;
