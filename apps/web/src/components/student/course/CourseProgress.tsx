import { useTranslations } from 'next-intl';

/** "40% complete" with a bar (the bar is decoration; the text says it). */
export function CourseProgress({ percent }: { percent: number }) {
  const t = useTranslations('StudentLesson');
  return (
    <div className="mt-2 flex flex-col gap-1">
      <p className="text-sm text-ink-muted">{t('progress', { percent })}</p>
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-sand">
        <div className="h-full rounded-full bg-crimson-700" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
