import type { TeachLessonList, TeachLessonSummary } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { teachContentPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

type LessonState = 'published' | 'draft' | 'processing';
const TONE: Record<LessonState, BadgeTone> = {
  published: 'sage',
  draft: 'neutral',
  processing: 'gold',
};
const stateOf = (lesson: TeachLessonSummary): LessonState =>
  lesson.processing ? 'processing' : lesson.status;

/** Lessons grouped by module (design "Instructor 6", left column). */
export function LessonList({
  list,
  selectedId,
}: {
  list: TeachLessonList;
  selectedId: string | null;
}) {
  const t = useTranslations('TeachContent');
  const groups = [
    ...list.modules.map((module, index) => ({
      key: module.id,
      title: t('module', { number: index + 1, title: module.title }),
      lessons: list.lessons.filter((lesson) => lesson.moduleId === module.id),
    })),
    {
      key: 'other',
      title: t('other'),
      lessons: list.lessons.filter((lesson) => !lesson.moduleId),
    },
  ].filter((group) => group.lessons.length > 0);

  if (list.lessons.length === 0)
    return <p className="p-4 text-sm text-ink-muted">{t('noLessons')}</p>;

  return (
    <nav aria-label={t('lessonsLabel')}>
      {groups.map((group) => (
        <section key={group.key} className="py-2">
          <h2 className="px-4 py-2 font-mono text-xs tracking-wider text-ink-muted uppercase">
            {group.title}
          </h2>
          <ul>
            {group.lessons.map((lesson) => {
              const current = lesson.id === selectedId;
              const state = stateOf(lesson);
              return (
                <li key={lesson.id}>
                  <Link
                    href={teachContentPath(list.program.id, lesson.id)}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream',
                      current && 'bg-crimson-50 font-semibold',
                    )}
                  >
                    <span className="w-6 shrink-0 text-ink-muted">{lesson.position}</span>
                    <span className="min-w-0 flex-1 text-ink">{lesson.title}</span>
                    <Badge tone={TONE[state]}>{t(`status.${state}`)}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
