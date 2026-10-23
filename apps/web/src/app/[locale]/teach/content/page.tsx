import type { AssignmentView, TeachLesson, TeachLessonList, TeachProgram } from '@eta/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/student/DashboardCard';
import { AddLessonDialog } from '@/components/teach/content/AddLessonDialog';
import { LessonEditor } from '@/components/teach/content/LessonEditor';
import { LessonList } from '@/components/teach/content/LessonList';
import { PillNav } from '@/components/ui/PillNav';
import { teachContentPath } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TeachContent');
  return { title: t('metaTitle') };
}

/** The lesson in the editor with its exercise. */
async function loadLesson(lessonId: string) {
  const [lesson, exercise] = await Promise.all([
    getAsUser<TeachLesson>(`/api/teach/lessons/${lessonId}`),
    getAsUser<{ assignment: AssignmentView | null }>(`/api/teach/lessons/${lessonId}/assignment`),
  ]);
  return { lesson, assignment: exercise.assignment };
}

const single = (value: string | string[] | undefined) => (typeof value === 'string' ? value : null);

/** Course content (design "Instructor 6"): lessons of a program and the lesson editor. */
export default async function TeachContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const [programs, t] = await Promise.all([
    // Mentors without a program (career advisors) simply see the empty state.
    getAsUser<TeachProgram[]>('/api/teach/programs').catch(() => []),
    getTranslations('TeachContent'),
  ]);
  const program = programs.find((item) => item.id === single(query['program'])) ?? programs[0];

  if (!program) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
        <div className="mt-6">
          <EmptyState text={t('noPrograms')} />
        </div>
      </div>
    );
  }

  const list = await getAsUser<TeachLessonList>(`/api/teach/programs/${program.id}/lessons`);
  const lessonId =
    list.lessons.find((lesson) => lesson.id === single(query['lesson']))?.id ?? list.lessons[0]?.id;
  const opened = lessonId ? await loadLesson(lessonId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('subtitle', { program: program.title })}</p>
        </div>
        <AddLessonDialog programId={program.id} modules={list.modules} />
      </div>

      {programs.length > 1 && (
        <PillNav
          label={t('program')}
          items={programs.map((item) => ({
            key: item.id,
            href: teachContentPath(item.id),
            label: item.title,
            current: item.id === program.id,
          }))}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-sm">
          <LessonList list={list} selectedId={opened?.lesson.id ?? null} />
        </div>
        {opened && (
          <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm sm:p-6">
            {/* key: switching lessons starts the form from that lesson's saved values. */}
            <LessonEditor
              key={`${opened.lesson.id}-${opened.lesson.updatedAt}`}
              lesson={opened.lesson}
              list={list}
              assignment={opened.assignment}
            />
          </div>
        )}
      </div>
    </div>
  );
}
