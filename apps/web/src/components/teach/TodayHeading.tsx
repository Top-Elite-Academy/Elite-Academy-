import type { TeachCohort } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { partOfDay } from '@/lib/format/jerusalem-now';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

/** "Good evening, Dania" + "Wednesday, 21 October · FSA-03 is in week 12 of 24". */
export function TodayHeading({
  firstName,
  now,
  running,
}: {
  firstName: string;
  now: { isoDate: string; hour: number };
  running: TeachCohort[];
}) {
  const t = useTranslations('Teach');
  const dates = useCohortFormat();
  const weeks = running.flatMap((cohort) =>
    cohort.week?.total
      ? [
          t('weekLine', {
            cohort: cohort.name,
            current: cohort.week.current,
            total: cohort.week.total,
          }),
        ]
      : [],
  );
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">
        {t(`greeting.${partOfDay(now.hour)}`, { name: firstName })}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        {[dates.longDate(now.isoDate), ...weeks].join(' · ')}
      </p>
    </div>
  );
}
