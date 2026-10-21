import type { ProgramSummary } from '@eta/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { CalendarIcon, ClockIcon, GraduationIcon, LiveIcon, UserIcon } from '@/components/ui/icons';
import { programPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';

/**
 * Program card (spec §3.1, §3.2): title, instructor, level, next cohort and the
 * practical stage. Never a price. The whole card is one link to the course details.
 */
export function ProgramCard({ program }: { program: ProgramSummary }) {
  const t = useTranslations('ProgramCard');
  const tLevel = useTranslations('Levels');
  const format = useFormatter();
  const nextCohort = program.nextCohortStart
    ? format.dateTime(new Date(`${program.nextCohortStart}T00:00:00Z`), {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
        numberingSystem: 'latn',
      })
    : null;

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
      <div className="relative flex h-24 items-end justify-between border-b-4 border-gold-700 bg-maroon-900 bg-dots px-4 pb-3">
        <p className="font-mono text-xs text-gold-100" dir="ltr">
          {program.tags.join(' · ')}
        </p>
        <LiveIcon className="size-6 text-gold-400" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone="gold" icon={<LiveIcon className="size-3.5" />}>
            {t('program')}
          </Badge>
          <Badge icon={<GraduationIcon className="size-3.5" />}>{tLevel(program.level)}</Badge>
        </div>

        <h3 className="mt-3 text-lg font-semibold text-ink">
          {/* The ::after layer makes the whole card clickable through this single link. */}
          <Link
            href={programPath(program.slug)}
            className="after:absolute after:inset-0 after:content-[''] focus:outline-none"
          >
            {program.title}
          </Link>
        </h3>

        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          <li className="flex items-center gap-2">
            <ClockIcon className="size-4" />
            {t('practicalStage')}
          </li>
          <li className="flex items-center gap-2">
            <CalendarIcon className="size-4" />
            {nextCohort ? t('nextCohort', { date: nextCohort }) : t('nextCohortSoon')}
          </li>
          {program.instructorName && (
            <li className="flex items-center gap-2">
              <UserIcon className="size-4" />
              {program.instructorName}
            </li>
          )}
        </ul>

        <div className="mt-auto pt-5">
          <div className="flex justify-end border-t border-border pt-4">
            <span aria-hidden="true" className={buttonClasses({ size: 'sm' })}>
              {t('viewDetails')}
            </span>
          </div>
        </div>
      </div>

      {/* Visible focus ring for the whole card when its link is focused. */}
      <span className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] ring-crimson-700 group-has-[:focus-visible]:ring-3" />
    </article>
  );
}
