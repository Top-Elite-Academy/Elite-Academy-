import type { ProgramDetails } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { CourseSection } from '../CourseSection';

/** Translation keys of the two stages every program includes. */
const STAGES = ['stageLearning', 'stagePractical'] as const;

/** Who it is for, plus the two stages included in every program (spec §1, §3.3). */
export function OverviewSection({ program }: { program: ProgramDetails }) {
  const t = useTranslations('Course.overview');
  return (
    <CourseSection id="overview" title={t('title')}>
      {program.overview && <p className="leading-relaxed text-ink">{program.overview}</p>}
      {program.audience && (
        <p className="mt-4 leading-relaxed text-ink-muted">
          <strong className="font-semibold text-ink">{t('audience')}</strong> {program.audience}
        </p>
      )}
      <h3 className="mt-6 text-sm font-semibold text-ink">{t('stagesTitle')}</h3>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {STAGES.map((stage, index) => (
          <li
            key={stage}
            className="flex gap-3 rounded-[var(--radius-control)] bg-cream p-4 text-sm"
          >
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-crimson-50 text-xs font-semibold text-crimson-700"
            >
              {index + 1}
            </span>
            <span className="text-ink">{t(stage)}</span>
          </li>
        ))}
      </ol>
    </CourseSection>
  );
}
