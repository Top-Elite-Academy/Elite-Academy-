import type { Prisma } from '@eta/db';
import type { DiscussionAuthor, DiscussionPost, DiscussionSummary } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';

const AUTHOR = {
  select: { id: true, firstName: true, lastName: true, roles: { select: { role: true } } },
} as const;
const STAFF_ROLES = new Set(['instructor', 'admin']);

export const COHORT_INCLUDE = {
  include: { program: { select: { slug: true, instructor: { select: { userId: true } } } } },
} as const;

export const SUMMARY_INCLUDE = {
  author: AUTHOR,
  assignment: { select: { id: true, title: true, lessonId: true } },
  _count: { select: { replies: { where: { removedAt: null } } } },
  reports: { where: { resolvedAt: null }, select: { id: true } },
} satisfies Prisma.DiscussionThreadInclude;
export type SummaryRecord = Prisma.DiscussionThreadGetPayload<{ include: typeof SUMMARY_INCLUDE }>;

export const THREAD_INCLUDE = {
  author: AUTHOR,
  assignment: { select: { title: true, lessonId: true } },
  cohort: COHORT_INCLUDE,
  replies: {
    include: { author: AUTHOR, reports: { where: { resolvedAt: null }, select: { id: true } } },
    orderBy: { createdAt: 'asc' },
  },
  reports: { where: { resolvedAt: null, replyId: null }, select: { id: true } },
} satisfies Prisma.DiscussionThreadInclude;
export type ThreadRecord = Prisma.DiscussionThreadGetPayload<{ include: typeof THREAD_INCLUDE }>;

type Person = { id: string; firstName: string; lastName: string; roles: { role: string }[] };

/** Classmates are "Maya R."; the instructor and admins are shown as staff. */
export function toAuthor(user: AuthUser, author: Person): DiscussionAuthor {
  const initial = author.lastName.trim().charAt(0);
  return {
    name: initial ? `${author.firstName} ${initial}.` : author.firstName,
    role: author.roles.some((row) => STAFF_ROLES.has(row.role)) ? 'staff' : 'student',
    isMe: author.id === user.id,
  };
}

export function toSummary(
  user: AuthUser,
  thread: SummaryRecord,
  moderator: boolean,
): DiscussionSummary {
  return {
    id: thread.id,
    title: thread.title,
    author: toAuthor(user, thread.author),
    pinned: thread.pinned,
    answered: thread.answerReplyId !== null,
    replyCount: thread._count.replies,
    lastActivityAt: thread.lastActivityAt.toISOString(),
    createdAt: thread.createdAt.toISOString(),
    removed: thread.removedBy,
    openReports: moderator ? thread.reports.length : null,
    assignment: thread.assignment,
  };
}

/** The question or a reply. Students never get the text of a removed post. */
export function toPost(
  user: AuthUser,
  post: {
    id: string;
    body: string;
    author: Person;
    createdAt: Date;
    removedBy: DiscussionPost['removed'];
    reports: { id: string }[];
  },
  moderator: boolean,
): DiscussionPost {
  const mine = post.author.id === user.id;
  const live = post.removedBy === null;
  return {
    id: post.id,
    body: live || moderator ? post.body : null,
    author: toAuthor(user, post.author),
    createdAt: post.createdAt.toISOString(),
    removed: post.removedBy,
    openReports: moderator ? post.reports.length : null,
    canDelete: live && (mine || moderator),
    canReport: live && !mine && !moderator,
  };
}
