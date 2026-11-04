import type { DiscussionSummary } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { Link } from '@/i18n/navigation';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { AuthorName } from './AuthorName';

/**
 * Questions of one discussion: pinned first, then the most recently active.
 * Instructors also see removed questions and open reports.
 */
export function DiscussionList({
  threads,
  hrefs,
  showAssignment = false,
}: {
  threads: DiscussionSummary[];
  /** Thread id → link to its page. */
  hrefs: Record<string, string>;
  /** In the instructor's cohort view, which exercise each question is about. */
  showAssignment?: boolean;
}) {
  const t = useTranslations('Discussion');
  const when = useBookingFormat();
  if (threads.length === 0) return <p className="text-ink-muted">{t('empty')}</p>;

  return (
    <ul className="flex flex-col divide-y divide-border">
      {threads.map((thread) => (
        <li key={thread.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            {thread.pinned && <Badge tone="gold">{t('pinned')}</Badge>}
            {thread.answered && <Badge tone="sage">{t('answered')}</Badge>}
            {thread.removed && <Badge tone="neutral">{t(`removedBadge.${thread.removed}`)}</Badge>}
            {thread.openReports ? (
              <Badge tone="danger">{t('reports', { count: thread.openReports })}</Badge>
            ) : null}
          </div>
          <Link
            href={hrefs[thread.id] ?? '#'}
            className="font-semibold text-ink underline-offset-2 hover:text-crimson-700 hover:underline"
          >
            {thread.title}
          </Link>
          <p className="text-sm text-ink-muted">
            {showAssignment && <>{thread.assignment.title} · </>}
            <AuthorName author={thread.author} /> · {t('replies', { count: thread.replyCount })} ·{' '}
            {t('active', { when: when.dayTime(thread.lastActivityAt) })}
          </p>
        </li>
      ))}
    </ul>
  );
}
