import type { TeachCohort } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { useCohortFormat } from '@/lib/format/use-cohort-format';
import { useCohortWhen } from './CohortCard';

/** "Full Stack Advanced with AI · FSA-03" with its dates, schedule and size. */
export function CohortHeader({ cohort }: { cohort: TeachCohort }) {
  const t = useTranslations('Teach');
  const dates = useCohortFormat();
  const when = useCohortWhen();
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {`${cohort.program.title} · ${cohort.name}`}
        </h1>
        <Badge tone="gold">{t(`cohorts.status.${cohort.status}`)}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {when(cohort)}
        {cohort.schedule && (
          <>
            {' · '}
            {dates.days(cohort.schedule)} · <span dir="ltr">{dates.time(cohort.schedule)}</span>
          </>
        )}
        {' · '}
        {t('nav.students', { count: cohort.confirmed })}
      </p>
    </div>
  );
}
