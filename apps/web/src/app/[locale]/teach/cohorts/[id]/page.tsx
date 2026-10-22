import type { AnnouncementView, CohortStudent, TeachCohort } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { DashboardCard } from '@/components/student/DashboardCard';
import { AnnouncementDialog } from '@/components/teach/AnnouncementDialog';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { CohortHeader } from '@/components/teach/CohortHeader';
import { CohortStudents } from '@/components/teach/CohortStudents';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { TEACH_ROUTES } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { isBookingId } from '@/lib/booking/booking-state';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Teach.cohorts');
  return { title: t('title') };
}

/** One cohort (design "Instructor 2"): students and announcements. */
export default async function TeachCohortPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isBookingId(id)) notFound();
  const [cohort, students, announcements, t] = await Promise.all([
    getAsUser<TeachCohort>(`/api/teach/cohorts/${id}`).catch(() => null),
    getAsUser<CohortStudent[]>(`/api/teach/cohorts/${id}/students`).catch(() => []),
    getAsUser<AnnouncementView[]>(`/api/teach/cohorts/${id}/announcements`).catch(() => []),
    getTranslations('Teach'),
  ]);
  // Not one of this instructor's cohorts: same answer as a missing one.
  if (!cohort) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('nav.today'), href: TEACH_ROUTES.today },
          { label: t('cohort.crumb'), href: TEACH_ROUTES.cohorts },
          { label: cohort.name },
        ]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <CohortHeader cohort={cohort} />
        <AnnouncementDialog
          cohorts={[{ id: cohort.id, label: `${cohort.name} · ${cohort.program.title}` }]}
          defaultCohortId={cohort.id}
        />
      </div>
      <DashboardCard title={t('cohort.studentsTitle')}>
        <CohortStudents students={students} />
      </DashboardCard>
      <DashboardCard title={t('cohort.announcementsTitle')}>
        <AnnouncementList items={announcements} emptyText={t('announcements.empty')} />
      </DashboardCard>
    </div>
  );
}
