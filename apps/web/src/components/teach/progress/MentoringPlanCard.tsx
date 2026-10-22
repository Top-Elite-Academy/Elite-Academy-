import type { StudentProgress } from '@eta/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { DashboardCard } from '@/components/student/DashboardCard';
import { cn } from '@/lib/cn';

type Plan = NonNullable<StudentProgress['mentoringPlan']>;

/** The student's mentoring plan with this instructor: sessions used and the last session. */
export function MentoringPlanCard({ plan }: { plan: Plan }) {
  const t = useTranslations('TeachProgress.student.plan');
  const format = useFormatter();
  const last = plan.lastSession;
  return (
    <DashboardCard title={t('title')}>
      <p className="flex justify-between text-sm">
        <span className="text-ink-muted">{t('used')}</span>
        <span className="font-semibold text-ink">
          {t('usedValue', { used: plan.used, total: plan.total })}
        </span>
      </p>
      <div aria-hidden="true" className="mt-2 flex gap-1">
        {Array.from({ length: plan.total }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-2.5 flex-1 rounded-sm',
              index < plan.used ? 'bg-crimson-700' : 'bg-sand',
            )}
          />
        ))}
      </div>
      {last ? (
        <div className="mt-3 text-sm">
          <p className="text-ink-muted">
            {t('lastSession', {
              date: format.dateTime(new Date(last.startAt), {
                day: 'numeric',
                month: 'long',
                timeZone: 'Asia/Jerusalem',
                numberingSystem: 'latn',
              }),
            })}
          </p>
          {last.notes && <p className="mt-1 whitespace-pre-line text-ink">{last.notes}</p>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">{t('noSession')}</p>
      )}
    </DashboardCard>
  );
}
