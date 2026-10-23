import type { GradeQueueItem } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { LateBadge } from '@/components/assignments/SubmissionBadges';
import { teachGradingPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { useBookingFormat } from '@/lib/format/use-booking-format';

/** The oldest hand-ins waiting for a grade (design "Instructor 1"). */
export function GradeQueue({ items }: { items: GradeQueueItem[] }) {
  const t = useTranslations('Teach.toGrade');
  const when = useBookingFormat();
  if (items.length === 0) return <p className="text-sm text-ink-muted">{t('empty')}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-1 py-3">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={teachGradingPath(item.cohortId, { submission: item.id })}
              className="font-semibold text-crimson-700 underline"
            >
              {`${item.student.firstName} ${item.student.lastName}`}
            </Link>
            <LateBadge days={item.lateDays} />
          </span>
          <span className="text-sm text-ink-muted">
            {t('detail', { title: item.title, when: when.dayTime(item.submittedAt) })}
          </span>
        </li>
      ))}
    </ul>
  );
}
