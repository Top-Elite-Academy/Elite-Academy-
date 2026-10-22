import type { StudentEnrollment, StudentOverview } from '@eta/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DashboardCard, EmptyState } from '@/components/student/DashboardCard';
import { EnrollmentCard } from '@/components/student/EnrollmentCard';
import { PackageCard } from '@/components/student/PackageCard';
import { SessionItem } from '@/components/student/SessionItem';
import { ButtonLink } from '@/components/ui/Button';
import { ROUTES, STUDENT_ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { getAsUser } from '@/lib/api/server';
import { requireUser } from '@/lib/auth/require-user';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Student.overview');
  return { title: t('metaTitle') };
}

/** Overview (spec §4.3): welcome, next sessions, mentoring plan, courses. */
export default async function StudentOverviewPage() {
  const [user, overview, enrollments, t] = await Promise.all([
    requireUser(ROUTES.account, ['student']),
    getAsUser<StudentOverview>('/api/me/overview'),
    getAsUser<StudentEnrollment[]>('/api/me/enrollments'),
    getTranslations('Student.overview'),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="on-dark rounded-[var(--radius-card)] bg-maroon-900 bg-dots p-6 text-white lg:col-span-3">
        <h1 className="font-display text-3xl font-semibold">
          {t('welcome', { firstName: user.firstName })}
        </h1>
        <p className="mt-2 text-white/85">{t('intro')}</p>
      </section>

      <DashboardCard
        title={t('upcomingTitle')}
        className="lg:col-span-2"
        action={
          overview.upcoming.length > 0 && (
            <Link
              href={STUDENT_ROUTES.sessions}
              className="text-sm font-semibold text-crimson-700 underline"
            >
              {t('viewAll')}
            </Link>
          )
        }
      >
        {overview.upcoming.length === 0 ? (
          <EmptyState text={t('noUpcoming')}>
            <ButtonLink href={ROUTES.mentoring}>{t('bookSession')}</ButtonLink>
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {overview.upcoming.map((session) => (
              <li key={session.id}>
                <SessionItem session={session} upcoming />
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <div className="flex flex-col gap-6">
        {overview.packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
        <DashboardCard
          title={t('coursesTitle')}
          action={
            <Link
              href={STUDENT_ROUTES.courses}
              className="text-sm font-semibold text-crimson-700 underline"
            >
              {t('viewCourses')}
            </Link>
          }
        >
          {enrollments.length === 0 ? (
            <EmptyState text={t('noCourses')}>
              <ButtonLink href={STUDENT_ROUTES.courses} variant="secondary">
                {t('joinCohort')}
              </ButtonLink>
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {enrollments.map((enrollment) => (
                <li key={enrollment.id}>
                  <EnrollmentCard enrollment={enrollment} compact />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
