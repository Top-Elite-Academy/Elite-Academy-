import type { ProgramDetails } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import {
  CalendarIcon,
  ClockIcon,
  GlobeIcon,
  GraduationIcon,
  LiveIcon,
} from '@/components/ui/icons';
import { ROUTES } from '@/config/navigation';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

/** Course page header (spec §3.3): breadcrumb, badges, title, summary and four key facts. */
export function CourseHero({ program }: { program: ProgramDetails }) {
  const t = useTranslations();
  const locale = useLocale();
  const dates = useCohortFormat();
  const languageNames = new Intl.DisplayNames(locale, { type: 'language' });
  const languages = program.teachingLanguages.map((code) => languageNames.of(code) ?? code);

  return (
    <section aria-labelledby="course-title" className="on-dark bg-maroon-900 bg-dots text-white">
      <Container className="pt-8 pb-12 lg:pb-16">
        <Breadcrumbs
          onDark
          items={[
            { label: t('Breadcrumbs.home'), href: ROUTES.home },
            { label: t('Nav.courses'), href: ROUTES.courses },
            { label: program.title },
          ]}
        />
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge tone="gold" icon={<LiveIcon className="size-3.5" />}>
            {t('ProgramCard.liveCourse')}
          </Badge>
          <Badge icon={<GraduationIcon className="size-3.5" />}>
            {t(`Levels.${program.level}`)}
          </Badge>
        </div>
        <h1
          id="course-title"
          className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight text-ivory sm:text-5xl"
        >
          {program.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">{program.summary}</p>

        <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-[calc(100%-24rem)] xl:grid-cols-4">
          <Fact icon={<ClockIcon className="size-4" />} label={t('Course.stats.duration')}>
            {program.lengthWeeks
              ? t('Course.stats.weeks', { weeks: program.lengthWeeks })
              : t('Course.stats.tbd')}
          </Fact>
          <Fact icon={<CalendarIcon className="size-4" />} label={t('Course.stats.nextCohort')}>
            {program.nextCohortStart
              ? dates.dayMonth(program.nextCohortStart)
              : t('Course.stats.tbd')}
          </Fact>
          <Fact icon={<LiveIcon className="size-4" />} label={t('Course.stats.format')}>
            {t('Course.stats.formatValue')}
          </Fact>
          <Fact icon={<GlobeIcon className="size-4" />} label={t('Course.stats.language')}>
            {languages.length ? languages.join(' · ') : t('Course.stats.tbd')}
          </Fact>
        </dl>
      </Container>
    </section>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-white/15 bg-white/5 px-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-white/80">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-white">{children}</dd>
    </div>
  );
}
