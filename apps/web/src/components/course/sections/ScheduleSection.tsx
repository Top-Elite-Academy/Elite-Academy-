import type { CohortInfo } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { useCohortFormat } from '@/lib/format/use-cohort-format';
import { CourseSection } from '../CourseSection';

/** Few seats → highlight (design: "Only 2 seats left"). */
export const FEW_SEATS = 3;

/** Start date, days and times, seats left per cohort (spec §3.3). */
export function ScheduleSection({ cohorts }: { cohorts: CohortInfo[] }) {
  const t = useTranslations('Course.schedule');
  const format = useCohortFormat();

  return (
    <CourseSection id="schedule" title={t('title')}>
      <p className="leading-relaxed text-ink-muted">{t('intro')}</p>
      {cohorts.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-control)] bg-cream p-4 text-ink">{t('none')}</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-start text-sm">
            <thead>
              <tr className="border-b border-border text-ink-muted">
                <th scope="col" className="py-2 pe-4 text-start font-semibold">
                  {t('cohort')}
                </th>
                <th scope="col" className="py-2 pe-4 text-start font-semibold">
                  {t('starts')}
                </th>
                <th scope="col" className="py-2 pe-4 text-start font-semibold">
                  {t('daysTime')}
                </th>
                <th scope="col" className="py-2 text-start font-semibold">
                  {t('seats')}
                </th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.id} className="border-b border-border last:border-0">
                  <th scope="row" className="py-3 pe-4 text-start font-medium text-ink">
                    {t('cohortName', { month: format.month(cohort.startDate) })}
                  </th>
                  <td className="py-3 pe-4 text-ink">{format.longDate(cohort.startDate)}</td>
                  <td className="py-3 pe-4 text-ink">
                    {cohort.schedule ? (
                      <>
                        {format.days(cohort.schedule)} ·{' '}
                        <bdi dir="ltr" className="font-mono">
                          {format.time(cohort.schedule)}
                        </bdi>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3">
                    <SeatsBadge cohort={cohort} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CourseSection>
  );
}

function SeatsBadge({ cohort }: { cohort: CohortInfo }) {
  const t = useTranslations('Course.schedule');
  if (cohort.status === 'full') return <Badge>{t('full')}</Badge>;
  if (cohort.seatsLeft <= FEW_SEATS)
    return <Badge tone="gold">{t('seatsLeft', { count: cohort.seatsLeft })}</Badge>;
  return <Badge tone="sage">{t('open')}</Badge>;
}
