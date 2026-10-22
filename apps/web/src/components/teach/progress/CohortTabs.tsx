import { useTranslations } from 'next-intl';
import { teachCohortPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export type CohortTab = 'students' | 'attendance' | 'schedule';
const TABS: CohortTab[] = ['students', 'attendance', 'schedule'];

/** Students · Attendance · Class schedule (design "Instructor 2"); each is its own URL. */
export function CohortTabs({ cohortId, current }: { cohortId: string; current: CohortTab }) {
  const t = useTranslations('TeachProgress.tabs');
  return (
    <nav aria-label={t('label')} className="border-b border-border">
      <ul className="flex gap-6 overflow-x-auto">
        {TABS.map((tab) => (
          <li key={tab}>
            <Link
              href={
                tab === 'students'
                  ? teachCohortPath(cohortId)
                  : `${teachCohortPath(cohortId)}?tab=${tab}`
              }
              aria-current={tab === current ? 'page' : undefined}
              className={cn(
                '-mb-px inline-block border-b-2 py-3 font-semibold whitespace-nowrap',
                tab === current
                  ? 'border-crimson-700 text-crimson-700'
                  : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {t(tab)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
