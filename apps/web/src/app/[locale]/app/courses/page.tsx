import type { CohortRef, StudentEnrollment } from '@eta/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DashboardCard, EmptyState } from '@/components/student/DashboardCard';
import { EnrollmentCard } from '@/components/student/EnrollmentCard';
import { JoinCohortForm } from '@/components/student/JoinCohortForm';
import { ButtonLink } from '@/components/ui/Button';
import { ROUTES } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Student.courses');
  return { title: t('metaTitle') };
}

/** My courses (spec §4.4): joined cohorts (with their lessons) and joining a new one. */
export default async function StudentCoursesPage() {
  const [enrollments, available, t, tCourses] = await Promise.all([
    getAsUser<StudentEnrollment[]>('/api/me/enrollments'),
    getAsUser<CohortRef[]>('/api/me/available-cohorts'),
    getTranslations('Student.courses'),
    getTranslations('StudentCourses'),
  ]);
  const joinedIds = new Set(enrollments.map((enrollment) => enrollment.cohort.id));
  const open = available.filter((cohort) => !joinedIds.has(cohort.id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
      {enrollments.length === 0 ? (
        <EmptyState text={t('empty')}>
          <ButtonLink href={ROUTES.courses} variant="secondary">
            {t('browse')}
          </ButtonLink>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {enrollments.map((enrollment) => (
            <li key={enrollment.id}>
              <EnrollmentCard enrollment={enrollment} />
            </li>
          ))}
        </ul>
      )}
      <DashboardCard title={tCourses('joinTitle')}>
        <p className="mb-4 text-ink-muted">{tCourses('joinIntro')}</p>
        <JoinCohortForm cohorts={open} />
      </DashboardCard>
    </div>
  );
}
