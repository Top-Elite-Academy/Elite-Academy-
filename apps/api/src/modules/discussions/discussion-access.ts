import type { Prisma } from '@eta/db';
import type { AuthUser } from '../../common/authz/auth-context';

/**
 * Who sees a cohort's assignment discussions (spec §4.11): its confirmed
 * students, the program's instructor and admins. Everyone else gets 404.
 */
export function discussionScope(user: AuthUser): Prisma.DiscussionThreadWhereInput {
  if (user.roles.includes('admin')) return {};
  return {
    OR: [
      { cohort: { enrollments: { some: { userId: user.id, status: 'confirmed' } } } },
      { cohort: { program: { instructor: { userId: user.id } } } },
    ],
  };
}

/** Moderators: the cohort's instructor and admins. */
export const isModerator = (
  user: AuthUser,
  cohort: { program: { instructor: { userId: string | null } | null } },
) => user.roles.includes('admin') || cohort.program.instructor?.userId === user.id;
