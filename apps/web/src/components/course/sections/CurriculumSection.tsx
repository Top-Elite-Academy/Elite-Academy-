import type { ModuleInfo } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon } from '@/components/ui/icons';
import { syllabusPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { CourseSection } from '../CourseSection';

/** Modules as an accordion, each listing its weeks and topics; link to the full syllabus (spec §3.3). */
export function CurriculumSection({
  slug,
  modules,
  lengthWeeks,
}: {
  slug: string;
  modules: ModuleInfo[];
  lengthWeeks: number | null;
}) {
  const t = useTranslations('Course.curriculum');
  const totalWeeks = lengthWeeks ?? modules.at(-1)?.weekTo ?? 0;

  return (
    <CourseSection
      id="curriculum"
      title={t('title')}
      aside={
        modules.length > 0 ? t('summary', { units: modules.length, weeks: totalWeeks }) : undefined
      }
    >
      {modules.length === 0 ? (
        <p className="leading-relaxed text-ink-muted">{t('empty')}</p>
      ) : (
        <>
          <div className="space-y-3">
            {modules.map((module, index) => (
              <details
                key={module.order}
                open={index === 0}
                className="group rounded-[var(--radius-control)] border border-border open:border-ink/30"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-sm text-crimson-700" aria-hidden="true">
                    {String(module.order).padStart(2, '0')}
                  </span>
                  <span className="flex-1 font-semibold text-ink">{module.title}</span>
                  <span className="text-sm text-ink-muted">
                    {module.weekFrom === module.weekTo
                      ? t('week', { week: module.weekFrom })
                      : t('weeks', { from: module.weekFrom, to: module.weekTo })}
                  </span>
                  <ChevronDownIcon className="size-4 text-ink-muted transition-transform group-open:rotate-180" />
                </summary>
                <ul className="space-y-2 px-4 pb-4">
                  {module.topics.map((topic) => (
                    <li key={topic} className="rounded-md bg-cream px-3 py-2 text-sm text-ink">
                      {topic}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <Link
            href={syllabusPath(slug)}
            className="mt-5 inline-block rounded-sm font-semibold text-crimson-700 underline"
          >
            {t('syllabus')}
          </Link>
        </>
      )}
    </CourseSection>
  );
}
