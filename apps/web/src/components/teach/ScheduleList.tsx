import type { TeachScheduleItem } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useServiceText } from '@/components/booking/use-service-text';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { LiveIcon, UsersIcon } from '@/components/ui/icons';
import { teachCohortPath } from '@/config/navigation';
import { jerusalemDay } from '@/lib/format/jerusalem-now';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { cn } from '@/lib/cn';

/** Today's and tomorrow's live classes and mentoring sessions, in Jerusalem time. */
export function ScheduleList({ items, today }: { items: TeachScheduleItem[]; today: string }) {
  const t = useTranslations('Teach.schedule');
  const when = useBookingFormat();
  const service = useServiceText();

  if (items.length === 0) return <p className="text-ink-muted">{t('empty')}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const isToday = jerusalemDay(item.startAt) === today;
        const isClass = item.kind === 'liveClass';
        return (
          <li
            key={`${item.kind}-${item.startAt}-${item.title}`}
            className={cn(
              'flex flex-col gap-3 rounded-[var(--radius-control)] border p-4 sm:flex-row',
              isClass && isToday ? 'border-crimson-700/60 bg-white' : 'border-border',
              !isToday && 'bg-cream',
            )}
          >
            <div className="w-28 shrink-0 font-mono text-sm">
              {!isToday && <p className="font-semibold text-ink-muted">{t('tomorrow')}</p>}
              <p className="font-semibold text-ink" dir="ltr">
                {when.time(item.startAt)}
              </p>
              <p className="text-xs text-ink-muted">
                {t('until', { time: when.time(item.endAt) })}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={isClass ? 'gold' : 'sage'}
                  icon={
                    isClass ? <LiveIcon className="size-3.5" /> : <UsersIcon className="size-3.5" />
                  }
                >
                  {t(isClass ? 'liveClass' : item.kind)}
                </Badge>
                <span className="font-semibold text-ink">{item.title}</span>
              </div>
              {item.service && (
                <p className="mt-1 text-sm text-ink-muted">{service.title(item.service)}</p>
              )}
              {item.cohortId && (
                <div className="mt-3">
                  <ButtonLink href={teachCohortPath(item.cohortId)} variant="secondary" size="sm">
                    {t('openCohort')}
                  </ButtonLink>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
