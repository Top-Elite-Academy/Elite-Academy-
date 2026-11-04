import { Injectable } from '@nestjs/common';
import type { DiscussionRemovedBy } from '@eta/db';
import type { DiscussionThreadView, ModerateThreadInput } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { discussionScope } from './discussion-access';
import { DiscussionsService } from './discussions.service';

/**
 * Keeping the discussion healthy (spec §4.11): writers delete their own
 * posts; students report posts; the cohort's instructor pins, marks the
 * answer, removes posts and closes reports.
 */
@Injectable()
export class DiscussionModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discussions: DiscussionsService,
    private readonly audit: AuditService,
  ) {}

  /** The writer deletes their own question, or the instructor removes it. */
  async removeThread(user: AuthUser, threadId: string, client: ClientInfo): Promise<void> {
    const { thread, moderator } = await this.discussions.record(user, threadId);
    const by = this.remover(user, thread.authorId, moderator);
    if (thread.removedAt) return;
    await this.prisma.$transaction([
      this.prisma.discussionThread.update({
        where: { id: threadId },
        data: { removedAt: new Date(), removedBy: by },
      }),
      this.prisma.discussionReport.updateMany({
        where: { threadId, replyId: null, resolvedAt: null },
        data: { resolvedAt: new Date() },
      }),
    ]);
    await this.audit.record({
      actorId: user.id,
      action: 'discussion.removed',
      entity: 'discussion_thread',
      entityId: threadId,
      after: { by },
      client,
    });
  }

  async removeReply(user: AuthUser, replyId: string, client: ClientInfo): Promise<void> {
    const reply = await this.prisma.discussionReply.findFirst({
      where: { id: replyId, thread: discussionScope(user) },
    });
    if (!reply) throw ApiException.notFound();
    const { moderator } = await this.discussions.record(user, reply.threadId);
    const by = this.remover(user, reply.authorId, moderator);
    if (reply.removedAt) return;
    await this.prisma.$transaction([
      this.prisma.discussionReply.update({
        where: { id: replyId },
        data: { removedAt: new Date(), removedBy: by },
      }),
      // A removed reply cannot stay the answer.
      this.prisma.discussionThread.updateMany({
        where: { id: reply.threadId, answerReplyId: replyId },
        data: { answerReplyId: null },
      }),
      this.prisma.discussionReport.updateMany({
        where: { replyId, resolvedAt: null },
        data: { resolvedAt: new Date() },
      }),
    ]);
    await this.audit.record({
      actorId: user.id,
      action: 'discussion.replyRemoved',
      entity: 'discussion_reply',
      entityId: replyId,
      after: { by, threadId: reply.threadId },
      client,
    });
  }

  /** Own post → "author"; someone else's → only a moderator, as "staff". */
  private remover(user: AuthUser, authorId: string, moderator: boolean): DiscussionRemovedBy {
    if (authorId === user.id) return 'author';
    if (moderator) return 'staff';
    throw ApiException.forbidden();
  }

  /** Instructor: pin, or mark one of the thread's replies as the answer. */
  async moderate(
    user: AuthUser,
    threadId: string,
    input: ModerateThreadInput,
  ): Promise<DiscussionThreadView> {
    const { thread, moderator } = await this.discussions.record(user, threadId);
    if (!moderator) throw ApiException.forbidden();
    if (input.answerReplyId) {
      const answer = thread.replies.find((reply) => reply.id === input.answerReplyId);
      if (!answer || answer.removedAt) throw ApiException.badRequest('discussion.answerInvalid');
    }
    await this.prisma.discussionThread.update({
      where: { id: threadId },
      data: {
        ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
        ...(input.answerReplyId === undefined ? {} : { answerReplyId: input.answerReplyId }),
      },
    });
    return this.discussions.thread(user, threadId);
  }

  /** A student flags someone else's post; the instructor is told once per post and person. */
  async report(
    user: AuthUser,
    threadId: string,
    replyId: string | null,
    reason: string,
    client: ClientInfo,
  ): Promise<void> {
    const { thread, moderator } = await this.discussions.record(user, threadId);
    const post = replyId ? thread.replies.find((reply) => reply.id === replyId) : thread;
    if (!post) throw ApiException.notFound();
    if (moderator || post.authorId === user.id || post.removedAt) {
      throw ApiException.conflict('discussion.cannotReport');
    }
    const already = await this.prisma.discussionReport.findFirst({
      where: { threadId, replyId, reporterId: user.id, resolvedAt: null },
    });
    if (already) return;
    const created = await this.prisma.discussionReport.create({
      data: { threadId, replyId, reporterId: user.id, reason },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'discussion.reported',
      entity: 'discussion_report',
      entityId: created.id,
      after: { threadId, replyId },
      client,
    });
    const instructorId = thread.cohort.program.instructor?.userId;
    if (instructorId) {
      await this.discussions.notify([instructorId], 'discussion_report', user, {
        ...this.discussions.notificationTarget(thread),
        audience: 'staff',
      });
    }
  }

  /** Instructor keeps the reported posts: their open reports are closed. */
  async dismissReports(user: AuthUser, threadId: string, client: ClientInfo): Promise<void> {
    const { moderator } = await this.discussions.record(user, threadId);
    if (!moderator) throw ApiException.forbidden();
    const { count } = await this.prisma.discussionReport.updateMany({
      where: { threadId, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
    if (count > 0) {
      await this.audit.record({
        actorId: user.id,
        action: 'discussion.reportsDismissed',
        entity: 'discussion_thread',
        entityId: threadId,
        after: { count },
        client,
      });
    }
  }
}
