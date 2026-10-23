import type { SubmissionSummary } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { LateBadge } from '@/components/assignments/SubmissionBadges';
import { Badge } from '@/components/ui/Badge';
import { teachGradingPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { useBookingFormat } from '@/lib/format/use-booking-format';

/** Hand-ins of a cohort, oldest waiting first (design "Instructor 4", left column). */
export function SubmissionList({
  cohortId,
  status,
  items,
  selectedId,
}: {
  cohortId: string;
  status: string;
  items: SubmissionSummary[];
  selectedId: string | null;
}) {
  const t = useTranslations('TeachGrading');
  const when = useBookingFormat();
  if (items.length === 0) return <p className="p-5 text-sm text-ink-muted">{t('empty')}</p>;
  return (
    <nav aria-label={t('listLabel')}>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={teachGradingPath(cohortId, { status, submission: item.id })}
              aria-current={item.id === selectedId ? 'page' : undefined}
              className={cn(
                'flex flex-col gap-1 px-4 py-3 text-sm hover:bg-cream',
                item.id === selectedId && 'bg-sand',
              )}
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  {`${item.student.firstName} ${item.student.lastName}`}
                </span>
                {item.status === 'returned' ? (
                  <Badge tone="slate">{t('returnedScore', { score: item.score ?? 0 })}</Badge>
                ) : (
                  <LateBadge days={item.lateDays} />
                )}
              </span>
              <span className="text-ink-muted">
                {t('assignmentLine', {
                  number: item.assignment.lessonPosition,
                  title: item.assignment.title,
                })}
              </span>
              <span className="text-xs text-ink-muted">
                {t('submittedAt', { when: when.dayTime(item.submittedAt) })}
                {item.status === 'submitted' && item.score !== null && ` · ${t('draft')}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
