'use client';

import type { CohortInfo } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useCohortFormat } from '@/lib/format/use-cohort-format';
import { FEW_SEATS } from './sections/ScheduleSection';

/** Radio cards, one per cohort; a full cohort is shown disabled (spec §3.3). */
export function CohortPicker({
  cohorts,
  selectedId,
  onSelect,
}: {
  cohorts: CohortInfo[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('Course');
  const format = useCohortFormat();
  const legendId = useId();
  const name = useId();

  return (
    <fieldset aria-labelledby={legendId}>
      <legend id={legendId} className="text-sm font-semibold text-ink">
        {t('card.chooseCohort')}
      </legend>
      <div className="mt-3 space-y-2">
        {cohorts.map((cohort) => {
          const full = cohort.status === 'full';
          const selected = cohort.id === selectedId;
          return (
            <label
              key={cohort.id}
              className={cn(
                'flex items-center gap-3 rounded-[var(--radius-control)] border p-3.5',
                full
                  ? 'cursor-not-allowed bg-cream opacity-70'
                  : 'cursor-pointer hover:border-ink/40',
                selected ? 'border-crimson-700 ring-1 ring-crimson-700' : 'border-border',
                'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-crimson-700',
              )}
            >
              <input
                type="radio"
                name={name}
                value={cohort.id}
                checked={selected}
                disabled={full}
                onChange={() => {
                  onSelect(cohort.id);
                }}
                className="size-4 accent-crimson-700"
              />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">
                  {t('schedule.cohortName', { month: format.month(cohort.startDate) })}
                </span>
                <span className="block text-sm text-ink-muted">
                  {t('card.starts', { date: format.shortDate(cohort.startDate) })}
                </span>
              </span>
              <CohortTag cohort={cohort} />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function CohortTag({ cohort }: { cohort: CohortInfo }) {
  const t = useTranslations('Course.card');
  if (cohort.status === 'full') return <Badge>{t('full')}</Badge>;
  if (cohort.seatsLeft <= FEW_SEATS)
    return <Badge tone="gold">{t('fewSeats', { count: cohort.seatsLeft })}</Badge>;
  return <Badge tone="sage">{t('open')}</Badge>;
}
