import { Injectable } from '@nestjs/common';
import type {
  AskQuestionInput,
  DiscussionNotificationData,
  DiscussionSummary,
  DiscussionThreadView,
  StudentDiscussion,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StudentLessonsService } from '../lessons/student-lessons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TeachingService } from '../teaching/teaching.service';
import { discussionScope, isModerator } from './discussion-access';
import {
  SUMMARY_INCLUDE,
  THREAD_INCLUDE,
  type ThreadRecord,
  toAuthor,
  toPost,
  toSummary,
} from './discussions.mapper';

const LIST_LIMIT = 100;

/** Pinned questions first, then the most recently active. */
const LIST_ORDER = [{ pinned: 'desc' as const }, { lastActivityAt: 'desc' as const }];

/**
 * Assignment discussions (spec §4.11): reading, asking and replying. Every
 * query goes through discussionScope, so a thread id from the URL never
 * reveals another cohort. Deleting, reports and instructor tools are in
 * DiscussionModerationService.
 */
@Injectable()
export class DiscussionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lessons: StudentLessonsService,
    private readonly teaching: TeachingService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** The open lesson's exercise and the student's cohort; null when the lesson has no exercise. */
  private async studentContext(user: AuthUser, lessonId: string) {
    const lesson = await this.lessons.openLesson(user, lessonId);
    const assignment = await this.prisma.assignment.findUnique({ where: { lessonId: lesson.id } });
    if (!assignment) return null;
    const { cohort } = await this.lessons.access(user, lesson.programId);
    return { lesson, assignment, cohort };
  }

  /** The questions of the student's cohort about this lesson's exercise. */
  async forLesson(user: AuthUser, lessonId: string): Promise<StudentDiscussion | null> {
    const found = await this.studentContext(user, lessonId);
    if (!found) return null;
    const threads = await this.prisma.discussionThread.findMany({
      where: { assignmentId: found.assignment.id, cohortId: found.cohort.id, removedAt: null },
      include: SUMMARY_INCLUDE,
      orderBy: LIST_ORDER,
      take: LIST_LIMIT,
    });
    return {
      assignment: { id: found.assignment.id, title: found.assignment.title },
      threads: threads.map((thread) => toSummary(user, thread, false)),
    };
  }

  /** A student asks; the cohort's instructor is told. */
  async ask(
    user: AuthUser,
    lessonId: string,
    input: AskQuestionInput,
    client: ClientInfo,
  ): Promise<{ id: string }> {
    const found = await this.studentContext(user, lessonId);
    if (!found) throw ApiException.notFound();
    const { lesson, assignment, cohort } = found;
    const thread = await this.prisma.discussionThread.create({
      data: {
        assignmentId: assignment.id,
        cohortId: cohort.id,
        authorId: user.id,
        title: input.title,
        body: input.body,
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'discussion.asked',
      entity: 'discussion_thread',
      entityId: thread.id,
      after: { cohortId: cohort.id, assignmentId: assignment.id },
      client,
    });
    const instructorId = lesson.program.instructor?.userId;
    if (instructorId && instructorId !== user.id) {
      await this.notify([instructorId], 'discussion_question', user, {
        threadId: thread.id,
        title: thread.title,
        audience: 'staff',
        cohortId: cohort.id,
        lessonId: lesson.id,
        programSlug: lesson.program.slug,
      });
    }
    return { id: thread.id };
  }

  /** Every question of one of the instructor's cohorts, removed and reported ones included. */
  async forCohort(user: AuthUser, cohortId: string): Promise<DiscussionSummary[]> {
    await this.teaching.cohortRecord(user, cohortId);
    const threads = await this.prisma.discussionThread.findMany({
      where: { cohortId },
      include: SUMMARY_INCLUDE,
      orderBy: LIST_ORDER,
      take: LIST_LIMIT,
    });
    return threads.map((thread) => toSummary(user, thread, true));
  }

  /** A thread the user may see, or 404. Students never see a removed question. */
  async record(user: AuthUser, threadId: string) {
    const thread = await this.prisma.discussionThread.findFirst({
      where: { AND: [{ id: threadId }, discussionScope(user)] },
      include: THREAD_INCLUDE,
    });
    if (!thread) throw ApiException.notFound();
    const moderator = isModerator(user, thread.cohort);
    if (thread.removedAt && !moderator) throw ApiException.notFound();
    return { thread, moderator };
  }

  async thread(user: AuthUser, threadId: string): Promise<DiscussionThreadView> {
    const { thread, moderator } = await this.record(user, threadId);
    return this.toView(user, thread, moderator);
  }

  private toView(user: AuthUser, thread: ThreadRecord, moderator: boolean): DiscussionThreadView {
    return {
      id: thread.id,
      title: thread.title,
      question: toPost(user, thread, moderator),
      replies: thread.replies.map((reply) => toPost(user, reply, moderator)),
      pinned: thread.pinned,
      answerReplyId: thread.answerReplyId,
      moderator,
      canReply: thread.removedAt === null,
      context: {
        cohortId: thread.cohortId,
        cohortName: thread.cohort.name,
        lessonId: thread.assignment.lessonId,
        programSlug: thread.cohort.program.slug,
        assignmentTitle: thread.assignment.title,
      },
    };
  }

  /** Anyone who can see the thread replies; the person who asked is told. */
  async reply(user: AuthUser, threadId: string, body: string): Promise<DiscussionThreadView> {
    const { thread } = await this.record(user, threadId);
    if (thread.removedAt) throw ApiException.conflict('discussion.removed');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.discussionReply.create({ data: { threadId, authorId: user.id, body } }),
      this.prisma.discussionThread.update({
        where: { id: threadId },
        data: { lastActivityAt: now },
      }),
    ]);
    if (thread.authorId !== user.id) {
      await this.notify([thread.authorId], 'discussion_reply', user, {
        ...this.notificationTarget(thread),
        audience: 'student',
      });
    }
    return this.thread(user, threadId);
  }

  notificationTarget(thread: ThreadRecord) {
    return {
      threadId: thread.id,
      title: thread.title,
      cohortId: thread.cohortId,
      lessonId: thread.assignment.lessonId,
      programSlug: thread.cohort.program.slug,
    };
  }

  async notify(
    userIds: string[],
    type: 'discussion_question' | 'discussion_reply' | 'discussion_report',
    actor: AuthUser,
    data: Omit<DiscussionNotificationData, 'name'>,
  ): Promise<void> {
    const person = await this.prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { id: true, firstName: true, lastName: true, roles: { select: { role: true } } },
    });
    await this.notifications.notify(userIds, {
      type,
      data: { ...data, name: toAuthor(actor, person).name },
    });
  }
}
