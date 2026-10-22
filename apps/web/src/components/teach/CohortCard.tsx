import type { TeachCohort } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { teachCohortPath } from '@/config/navigation';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

const TONE: Record<TeachCohort['status'], BadgeTone> = {
  open: 'sage',
  full: 'slate',
  running: 'gold',
  finished: 'neutral',
};

/** Status line of a cohort: week while running, otherwise the start date. */
export function useCohortWhen() {
  const t = useTranslations('Teach');
  const dates = useCohortFormat();
  return (cohort: TeachCohort) =>
    cohort.week?.total
      ? t('nav.weekShort', { current: cohort.week.current, total: cohort.week.total })
      : cohort.week
        ? t('cohorts.startedOn', { date: dates.dayMonth(cohort.startDate) })
        : t('cohorts.startsOn', { date: dates.longDate(cohort.startDate) });
}

export function CohortCard({ cohort }: { cohort: TeachCohort }) {
  const t = useTranslations('Teach.cohorts');
  const dates = useCohortFormat();
  const when = useCohortWhen();
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-ink">{`${cohort.program.title} · ${cohort.name}`}</h2>
        <Badge tone={TONE[cohort.status]}>{t(`status.${cohort.status}`)}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {when(cohort)}
        {cohort.schedule && (
          <>
            {' · '}
            {dates.days(cohort.schedule)} · <span dir="ltr">{dates.time(cohort.schedule)}</span>
          </>
        )}
      </p>
      <p className="mt-3 mb-4 text-sm text-ink">
        {t('confirmed', { count: cohort.confirmed })}
        {cohort.pending > 0 && <> · {t('pending', { count: cohort.pending })}</>}
      </p>
      <div className="mt-auto">
        <ButtonLink href={teachCohortPath(cohort.id)} variant="secondary" size="sm">
          {t('view')}
          <span className="sr-only">{`: ${cohort.name}`}</span>
        </ButtonLink>
      </div>
    </article>
  );
}
