import type { CourseOutline } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CourseOutlineNav } from '@/components/student/course/CourseOutlineNav';
import { SyllabusCard } from '@/components/student/course/SyllabusCard';
import { ButtonLink } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import {
  STUDENT_ROUTES,
  studentLessonPath,
  studentSyllabusDownloadPath,
} from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { lessonToContinue } from '@/lib/course/outline';

const loadOutline = (slug: string) =>
  getAsUser<CourseOutline>(`/api/me/courses/${encodeURIComponent(slug)}`).catch(() => null);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const outline = await loadOutline((await params).slug);
  const t = await getTranslations('Student.courses');
  return { title: outline?.program.title ?? t('metaTitle') };
}

/** One course the student studies: progress, where to continue, the syllabus and all lessons (spec §4.8). */
export default async function StudentCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [outline, t, tCourses] = await Promise.all([
    loadOutline(slug),
    getTranslations('StudentLesson'),
    getTranslations('Student.courses'),
  ]);
  if (!outline) notFound();
  const next = lessonToContinue(outline);
  const started = outline.modules.some((module) => module.lessons.some((item) => item.completed));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: tCourses('title'), href: STUDENT_ROUTES.courses },
          { label: outline.program.title },
        ]}
      />
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-ink">{outline.program.title}</h1>
        <p className="text-ink-muted">
          {outline.cohort.week === null
            ? outline.cohort.name
            : t('cohortWeek', { cohort: outline.cohort.name, week: outline.cohort.week })}
        </p>
      </header>
      {next ? (
        <div>
          <ButtonLink href={studentLessonPath(outline.program.slug, next.id)}>
            {t(started ? 'continue' : 'start')}
          </ButtonLink>
        </div>
      ) : (
        outline.progressPercent === 100 && <p className="text-ink">{t('allDone')}</p>
      )}
      {outline.syllabus && (
        <SyllabusCard
          syllabus={outline.syllabus}
          href={studentSyllabusDownloadPath(outline.program.slug)}
        />
      )}
      <div className="max-w-2xl">
        <CourseOutlineNav outline={outline} />
      </div>
    </div>
  );
}
