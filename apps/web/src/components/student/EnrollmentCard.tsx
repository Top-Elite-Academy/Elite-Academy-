import type { StudentEnrollment } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { studentCoursePath } from '@/config/navigation';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

/**
 * One program the student joined. Pending: what happens next. Confirmed: the
 * way into the lessons and the cohort's latest announcements.
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
      {confirmed && <ConfirmedDetails enrollment={enrollment} compact={compact} />}
    </article>
  );
}

/** Attendance, the way into the lessons and (full card only) announcements. */
function ConfirmedDetails({
  enrollment,
  compact,
}: {
  enrollment: StudentEnrollment;
  compact: boolean;
}) {
  const t = useTranslations('StudentCourses');
  const { attendance } = enrollment;
  return (
    <>
      {attendance && attendance.marked > 0 && (
        <p className="mt-2 text-sm font-semibold text-ink">
          {t('attendance', { attended: attendance.attended, marked: attendance.marked })}
        </p>
      )}
      <div className="mt-4">
        <ButtonLink href={studentCoursePath(enrollment.cohort.program.slug)} size="sm">
          {t('openCourse')}
        </ButtonLink>
      </div>
      {!compact && (
        <section className="mt-4 border-t border-border pt-4">
          <h4 className="mb-3 text-sm font-semibold text-ink">{t('announcements')}</h4>
          <AnnouncementList items={enrollment.announcements} emptyText={t('noAnnouncements')} />
        </section>
      )}
    </>
  );
}
