import type { StudentEnrollment } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { Badge } from '@/components/ui/Badge';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

/**
 * One program the student joined. Pending: what happens next. Confirmed: the
 * cohort's latest announcements (lessons arrive in the next step).
 */
export function EnrollmentCard({
  enrollment,
  compact = false,
}: {
  enrollment: StudentEnrollment;
  /** Overview card: no announcements list. */
  compact?: boolean;
}) {
  const t = useTranslations('StudentCourses');
  const dates = useCohortFormat();
  const { cohort } = enrollment;
  const confirmed = enrollment.status === 'confirmed';

  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-ink">{`${cohort.program.title} · ${cohort.name}`}</h3>
        <Badge tone={confirmed ? 'sage' : 'gold'}>
          {t(confirmed ? 'confirmedBadge' : 'pendingBadge')}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {t('startsOn', { date: dates.longDate(cohort.startDate) })}
        {cohort.schedule && (
          <>
            {' · '}
            {dates.days(cohort.schedule)} · <span dir="ltr">{dates.time(cohort.schedule)}</span>
          </>
        )}
      </p>
      {enrollment.instructorName && (
        <p className="text-sm text-ink-muted">
          {t('instructor', { name: enrollment.instructorName })}
        </p>
      )}
      {!confirmed && <p className="mt-3 text-sm text-ink">{t('pendingNote')}</p>}
      {confirmed && !compact && (
        <section className="mt-4 border-t border-border pt-4">
          <h4 className="mb-3 text-sm font-semibold text-ink">{t('announcements')}</h4>
          <AnnouncementList items={enrollment.announcements} emptyText={t('noAnnouncements')} />
        </section>
      )}
    </article>
  );
}
