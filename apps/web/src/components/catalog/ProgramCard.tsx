import type { ProgramSummary } from '@eta/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink, buttonClasses } from '@/components/ui/Button';
import { CalendarIcon, ClockIcon, GraduationIcon, LiveIcon, UserIcon } from '@/components/ui/icons';
import { enrollPath, programPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

interface ProgramCardProps {
  program: ProgramSummary;
  /**
   * landing: the whole card is one link to the course details (spec §3.1).
   * catalog: separate "Enroll" and "More details" buttons (spec §3.2).
   */
  variant?: 'landing' | 'catalog';
}

/** Program card: title, instructor, level, length, next cohort, practical stage. Never a price. */
export function ProgramCard({ program, variant = 'landing' }: ProgramCardProps) {
  const t = useTranslations('ProgramCard');
  const tLevel = useTranslations('Levels');
  const isLanding = variant === 'landing';

  return (
    <article
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-sm transition-shadow hover:shadow-md',
        isLanding && 'focus-within:shadow-md',
      )}
    >
      <CardBand tags={program.tags} />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone="gold" icon={<LiveIcon className="size-3.5" />}>
            {t(isLanding ? 'program' : 'liveCourse')}
          </Badge>
          <Badge icon={<GraduationIcon className="size-3.5" />}>{tLevel(program.level)}</Badge>
        </div>

        <h3 className="mt-3 text-lg font-semibold text-ink">
          <Link
            href={programPath(program.slug)}
            className={cn(
              isLanding
                ? // The ::after layer makes the whole card clickable through this single link.
                  "after:absolute after:inset-0 after:content-[''] focus:outline-none"
                : 'rounded-sm hover:text-crimson-700',
            )}
          >
            {program.title}
          </Link>
        </h3>

        <ProgramMeta program={program} />

        <div className="mt-auto pt-5">
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            {isLanding ? (
              <span aria-hidden="true" className={buttonClasses({ size: 'sm' })}>
                {t('viewDetails')}
              </span>
            ) : (
              <>
                <ButtonLink href={enrollPath(program.slug)} size="sm">
                  {t('enroll')}
                  <span className="sr-only">{`: ${program.title}`}</span>
                </ButtonLink>
                <ButtonLink href={programPath(program.slug)} size="sm" variant="secondary">
                  {t('moreDetails')}
                  <span className="sr-only">{`: ${program.title}`}</span>
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </div>

      {isLanding && (
        // Visible focus ring for the whole card when its single link is focused.
        <span className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] ring-crimson-700 group-has-[:focus-visible]:ring-3" />
      )}
    </article>
  );
}

function CardBand({ tags }: { tags: string[] }) {
  return (
    <div className="relative flex h-24 items-end justify-between border-b-4 border-gold-700 bg-maroon-900 bg-dots px-4 pb-3">
      <p className="font-mono text-xs text-gold-100" dir="ltr">
        {tags.join(' · ')}
      </p>
      <LiveIcon className="size-6 text-gold-400" />
    </div>
  );
}

function ProgramMeta({ program }: { program: ProgramSummary }) {
  const t = useTranslations('ProgramCard');
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
    <ul className="mt-3 space-y-2 text-sm text-ink-muted">
      {program.lengthWeeks !== null && (
        <li className="flex items-center gap-2">
          <ClockIcon className="size-4" />
          {t('lengthWeeks', { weeks: program.lengthWeeks })}
        </li>
      )}
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
      <li className="flex items-center gap-2">
        <GraduationIcon className="size-4" />
        {t('practicalStage')}
      </li>
    </ul>
  );
}
