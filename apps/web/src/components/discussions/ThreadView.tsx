import type { DiscussionPost, DiscussionThreadView } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { AuthorName } from './AuthorName';
import { ModeratorBar } from './ModeratorBar';
import { PostActions } from './PostActions';
import { PostBody } from './PostBody';
import { ReplyForm } from './ReplyForm';

/**
 * One question with its replies (spec §4.11), for students and the
 * instructor alike; what each reader may do comes from the API.
 */
export function ThreadView({
  thread,
  afterDelete,
}: {
  thread: DiscussionThreadView;
  /** Where to go once the question itself is deleted. */
  afterDelete: string;
}) {
  const t = useTranslations('Discussion');
  const totalReports =
    (thread.question.openReports ?? 0) +
    thread.replies.reduce((sum, reply) => sum + (reply.openReports ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">
          {thread.context.assignmentTitle}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {thread.pinned && <Badge tone="gold">{t('pinned')}</Badge>}
          {thread.answerReplyId && <Badge tone="sage">{t('answered')}</Badge>}
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink">{thread.title}</h1>
        {thread.moderator && (
          <ModeratorBar threadId={thread.id} pinned={thread.pinned} openReports={totalReports} />
        )}
      </header>

      <Post thread={thread} post={thread.question} isQuestion afterDelete={afterDelete} />

      <section aria-labelledby="replies-title" className="flex flex-col gap-4">
        <h2 id="replies-title" className="text-lg font-semibold text-ink">
          {t('replies', { count: thread.replies.filter((reply) => !reply.removed).length })}
        </h2>
        {thread.replies.map((reply) => (
          <Post key={reply.id} thread={thread} post={reply} afterDelete={afterDelete} />
        ))}
      </section>

      {thread.canReply ? (
        <section className="rounded-[var(--radius-card)] border border-border bg-white p-5">
          <ReplyForm threadId={thread.id} />
          {!thread.moderator && <p className="mt-4 text-sm text-ink-muted">{t('guideline')}</p>}
        </section>
      ) : (
        <p className="text-ink-muted">{t('closed')}</p>
      )}
    </div>
  );
}

function Post({
  thread,
  post,
  isQuestion = false,
  afterDelete,
}: {
  thread: DiscussionThreadView;
  post: DiscussionPost;
  isQuestion?: boolean;
  afterDelete: string;
}) {
  const t = useTranslations('Discussion');
  const when = useBookingFormat();
  const isAnswer = thread.answerReplyId === post.id;

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-[var(--radius-card)] border bg-white p-5',
        isAnswer ? 'border-sage-700 ring-1 ring-sage-700' : 'border-border',
        post.removed && 'bg-cream',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <AuthorName author={post.author} />
        <span aria-hidden="true">·</span>
        <time dateTime={post.createdAt}>{when.dayTime(post.createdAt)}</time>
        {isAnswer && <Badge tone="sage">{t('answer')}</Badge>}
        {post.openReports ? (
          <Badge tone="danger">{t('reports', { count: post.openReports })}</Badge>
        ) : null}
      </div>
      {post.removed && (
        <p className="text-sm text-ink-muted italic">{t(`removed.${post.removed}`)}</p>
      )}
      {post.body !== null && <PostBody text={post.body} />}
      <PostActions
        threadId={thread.id}
        post={post}
        isQuestion={isQuestion}
        moderator={thread.moderator}
        isAnswer={isAnswer}
        afterDelete={afterDelete}
      />
    </article>
  );
}
