import { useTranslations } from 'next-intl';
import { CheckCircleIcon } from '@/components/ui/icons';
import { CourseSection } from '../CourseSection';

/** "What you'll learn" bullets (spec §3.3). */
export function OutcomesSection({ outcomes }: { outcomes: string[] }) {
  const t = useTranslations('Course.outcomes');
  if (outcomes.length === 0) return null;
  return (
    <CourseSection id="outcomes" title={t('title')}>
      <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {outcomes.map((outcome) => (
          <li key={outcome} className="flex gap-3 text-ink">
            <CheckCircleIcon className="mt-0.5 size-5 text-crimson-700" />
            {outcome}
          </li>
        ))}
      </ul>
    </CourseSection>
  );
}
