import type { AttendanceStatus } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

/** Tile for a class without a mark. */
const NOT_MARKED = 'none';

const STYLE: Record<AttendanceStatus | typeof NOT_MARKED, string> = {
  present: 'border-sage-700/40 bg-sage-100 text-sage-700',
  late: 'border-gold-700/40 bg-gold-100 text-gold-700',
  absent: 'border-crimson-700/40 bg-crimson-50 text-crimson-700',
  none: 'border-border bg-white text-ink-muted',
};

/** The last classes as small P / L / A tiles, oldest first, each with a full label. */
export function RecentAttendance({
  recent,
}: {
  recent: { date: string; status: AttendanceStatus | null }[];
}) {
  const t = useTranslations('TeachProgress.attendance');
  const dates = useCohortFormat();
  if (recent.length === 0) return <p className="text-sm text-ink-muted">{t('noClasses')}</p>;
  return (
    <>
      <ol className="flex flex-wrap gap-1.5">
        {[...recent].reverse().map((item) => {
          const key = item.status ?? NOT_MARKED;
          return (
            <li
              key={item.date}
              className={cn(
                'flex size-9 items-center justify-center rounded-md border text-sm font-bold',
                STYLE[key],
              )}
            >
              <span aria-hidden="true">{t(`short.${key}`)}</span>
              <span className="sr-only">
                {`${dates.longDate(item.date)}: ${item.status ? t(item.status) : t('short.none')}`}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-ink-muted">{t('legend')}</p>
    </>
  );
}
