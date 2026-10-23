import type { CourseOutline, StudentAssignment, StudentLesson } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CourseOutlineNav } from '@/components/student/course/CourseOutlineNav';
import { ExerciseCard } from '@/components/student/course/ExerciseCard';
import { LessonActions } from '@/components/student/course/LessonActions';
import { LessonTabs } from '@/components/student/course/LessonTabs';
import { LessonVideo } from '@/components/student/course/LessonVideo';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { messagesPath, STUDENT_ROUTES, studentCoursePath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { getAsUser } from '@/lib/api/server';
import { isBookingId } from '@/lib/booking/booking-state';
import { lessonNeighbours } from '@/lib/course/outline';

type Params = Promise<{ slug: string; id: string }>;

const loadLesson = (id: string) =>
  isBookingId(id)
    ? getAsUser<StudentLesson>(`/api/me/lessons/${id}`).catch(() => null)
    : Promise.resolve(null);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lesson = await loadLesson((await params).id);
  const t = await getTranslations('Student.courses');
  return { title: lesson?.title ?? t('metaTitle') };
}

/** The lesson player (spec §4.8): video, About and Downloads, done, next — with the course outline. */
export default async function StudentLessonPage({ params }: { params: Params }) {
  const { slug, id } = await params;
  const [lesson, outline, exercise, t, tCourses] = await Promise.all([
    loadLesson(id),
    getAsUser<CourseOutline>(`/api/me/courses/${encodeURIComponent(slug)}`).catch(() => null),
    isBookingId(id)
      ? getAsUser<{ assignment: StudentAssignment | null }>(
          `/api/me/lessons/${id}/assignment`,
        ).catch(() => null)
      : null,
    getTranslations('StudentLesson'),
    getTranslations('Student.courses'),
  ]);
  if (!lesson || !outline || lesson.program.slug !== outline.program.slug) notFound();
  const { previousId, nextId } = lessonNeighbours(outline, lesson.id);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: tCourses('title'), href: STUDENT_ROUTES.courses },
          { label: outline.program.title, href: studentCoursePath(outline.program.slug) },
          { label: lesson.title },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <header>
            <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">
              {t('lessonNumber', { number: lesson.position })}
            </p>
            <h1 className="font-display text-3xl font-semibold text-ink">{lesson.title}</h1>
          </header>
          <LessonVideo
            lessonId={lesson.id}
            videos={lesson.videos}
            positionSec={lesson.positionSec}
          />
          <LessonActions lesson={lesson} previousId={previousId} nextId={nextId} />
          <LessonTabs lesson={lesson} />
          {exercise?.assignment && (
            <ExerciseCard lessonId={lesson.id} assignment={exercise.assignment} />
          )}
          <p className="text-sm text-ink-muted">
            {t('technicalProblem')}{' '}
            <Link
              href={messagesPath(STUDENT_ROUTES.messages, { to: 'support' })}
              className="font-semibold text-crimson-700 underline"
            >
              {t('contactSupport')}
            </Link>
          </p>
        </div>
        <aside>
          <CourseOutlineNav outline={outline} currentLessonId={lesson.id} />
        </aside>
      </div>
    </div>
  );
}
