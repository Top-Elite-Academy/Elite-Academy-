import type { CourseOutline } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { CheckCircleIcon, LockIcon } from '@/components/ui/icons';
import { studentLessonPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { CourseProgress } from './CourseProgress';

type OutlineLesson = CourseOutline['modules'][number]['lessons'][number];

/** The course content sidebar (spec §4.8): lessons by module, done ones ticked, later weeks locked. */
export function CourseOutlineNav({
  outline,
  currentLessonId,
}: {
  outline: CourseOutline;
  currentLessonId?: string;
}) {
  const t = useTranslations('StudentLesson');
  return (
    <nav
      aria-label={t('outlineLabel')}
      className="rounded-[var(--radius-card)] border border-border bg-white p-4"
    >
      <h2 className="font-semibold text-ink">{t('outlineLabel')}</h2>
      <CourseProgress percent={outline.progressPercent} />
      {outline.modules.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">{t('noLessons')}</p>
      ) : (
        outline.modules.map((module) => (
          <section key={module.id ?? 'other'} className="mt-4">
            {module.title && (
              <h3 className="mb-2 font-mono text-xs tracking-wider text-ink-muted uppercase">
                {module.title}
              </h3>
            )}
            <ol className="flex flex-col gap-1">
              {module.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <OutlineItem
                    lesson={lesson}
                    slug={outline.program.slug}
                    current={lesson.id === currentLessonId}
                  />
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </nav>
  );
}

function OutlineItem({
  lesson,
  slug,
  current,
}: {
  lesson: OutlineLesson;
  slug: string;
  current: boolean;
}) {
  const t = useTranslations('StudentLesson');
  const label = (
    <span className="flex flex-col">
      <span className="text-xs text-ink-muted">
        {t('lessonNumber', { number: lesson.position })}
      </span>
      <span>{lesson.title}</span>
    </span>
  );

  if (lesson.lockedUntilWeek !== null) {
    return (
      <div className="flex items-start gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm text-ink-muted">
        <LockIcon className="mt-1 size-4 shrink-0" aria-hidden="true" />
        <span className="flex flex-col">
          {label}
          <span className="text-xs">{t('opensInWeek', { week: lesson.lockedUntilWeek })}</span>
        </span>
      </div>
    );
  }

  return (
    <Link
      href={studentLessonPath(slug, lesson.id)}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex items-start gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm text-ink hover:bg-cream',
        current && 'bg-sand font-semibold',
      )}
    >
      {lesson.completed ? (
        <CheckCircleIcon className="mt-1 size-4 shrink-0 text-sage-700" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className="mt-1 size-4 shrink-0 rounded-full border-2 border-ink/30"
        />
      )}
      {label}
      {lesson.completed && <span className="sr-only">{t('completedLabel')}</span>}
    </Link>
  );
}
