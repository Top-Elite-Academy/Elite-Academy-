import type { TeachCohort } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { DashboardCard } from '@/components/student/DashboardCard';
import { upcomingClassDates } from '@/lib/cohort/schedule';
import { jerusalemNow } from '@/lib/format/jerusalem-now';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

const NEXT_CLASSES = 8;

/** Class schedule tab: the weekly timetable and the next class days. */
export function ScheduleTab({ cohort }: { cohort: TeachCohort }) {
  const t = useTranslations('TeachProgress.schedule');
  const dates = useCohortFormat();
  const { schedule } = cohort;
  if (!schedule)
    return (
      <DashboardCard title={t('next')}>
        <p className="text-ink-muted">{t('none')}</p>
      </DashboardCard>
    );

  const next = upcomingClassDates(
    { startDate: cohort.startDate, lengthWeeks: cohort.program.lengthWeeks, schedule },
    jerusalemNow().isoDate,
    NEXT_CLASSES,
  );
  return (
    <DashboardCard title={t('next')}>
      <p className="text-ink">
        {t('when', { days: dates.days(schedule), time: dates.time(schedule) })}
        {cohort.program.lengthWeeks !== null && (
          <> · {t('length', { total: cohort.program.lengthWeeks })}</>
        )}
      </p>
      {next.length === 0 ? (
        <p className="mt-4 text-ink-muted">{t('finished')}</p>
      ) : (
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {next.map((day) => (
            <li
              key={day}
              className="rounded-[var(--radius-control)] border border-border bg-cream px-3 py-2 text-sm font-semibold text-ink"
            >
              {dates.longDate(day)}
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}
