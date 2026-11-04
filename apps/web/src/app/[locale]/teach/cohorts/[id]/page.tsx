import type {
  AnnouncementView,
  CohortAttendance,
  CohortStudent,
  DiscussionSummary,
  TeachCohort,
} from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { DiscussionList } from '@/components/discussions/DiscussionList';
import { DashboardCard } from '@/components/student/DashboardCard';
import { AnnouncementDialog } from '@/components/teach/AnnouncementDialog';
import { CohortHeader } from '@/components/teach/CohortHeader';
import { CohortStudents } from '@/components/teach/CohortStudents';
import { AttendanceTab } from '@/components/teach/progress/AttendanceTab';
import { CohortTabs, type CohortTab } from '@/components/teach/progress/CohortTabs';
import { ScheduleTab } from '@/components/teach/progress/ScheduleTab';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ButtonLink } from '@/components/ui/Button';
import { CheckIcon } from '@/components/ui/icons';
import { TEACH_ROUTES, teachCohortPath, teachThreadPath } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { isBookingId } from '@/lib/booking/booking-state';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Teach.cohorts');
  return { title: t('title') };
}

const TABS: CohortTab[] = ['students', 'attendance', 'schedule', 'discussions'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** One cohort (design "Instructor 2"): Students, Attendance, Class schedule and Discussions tabs. */
export default async function TeachCohortPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isBookingId(id)) notFound();
  const query = await searchParams;
  const tab = TABS.find((value) => value === query['tab']) ?? 'students';
  const date = typeof query['date'] === 'string' && DATE.test(query['date']) ? query['date'] : null;

  const [cohort, t, tProgress] = await Promise.all([
    getAsUser<TeachCohort>(`/api/teach/cohorts/${id}`).catch(() => null),
    getTranslations('Teach'),
    getTranslations('TeachProgress'),
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <CohortHeader cohort={cohort} />
        <div className="flex flex-wrap items-start gap-3">
          <AnnouncementDialog
            cohorts={[{ id: cohort.id, label: `${cohort.name} · ${cohort.program.title}` }]}
            defaultCohortId={cohort.id}
          />
          <ButtonLink href={`${teachCohortPath(cohort.id)}?tab=attendance`} variant="secondary">
            <CheckIcon className="size-4" />
            {tProgress('takeAttendance')}
          </ButtonLink>
        </div>
      </div>

      <CohortTabs cohortId={cohort.id} current={tab} />
      <TabContent cohort={cohort} tab={tab} date={date} />
    </div>
  );
}

async function TabContent({
  cohort,
  tab,
  date,
}: {
  cohort: TeachCohort;
  tab: CohortTab;
  date: string | null;
}) {
  const t = await getTranslations('Teach');
  if (tab === 'attendance') {
    const attendance = await getAsUser<CohortAttendance>(
      `/api/teach/cohorts/${cohort.id}/attendance${date ? `?date=${date}` : ''}`,
    );
    return (
      <DashboardCard title={t('cohort.studentsTitle')}>
        {/* key: a different class day starts with that day's saved marks. */}
        <AttendanceTab
          key={attendance.date ?? 'none'}
          cohortId={cohort.id}
          attendance={attendance}
        />
      </DashboardCard>
    );
  }
  if (tab === 'schedule') return <ScheduleTab cohort={cohort} />;
  if (tab === 'discussions') {
    const threads = await getAsUser<DiscussionSummary[]>(
      `/api/teach/cohorts/${cohort.id}/discussions`,
    );
    const hrefs = Object.fromEntries(
      threads.map((thread) => [thread.id, teachThreadPath(cohort.id, thread.id)]),
    );
    return (
      <DashboardCard title={t('cohort.discussionsTitle')}>
        <DiscussionList threads={threads} hrefs={hrefs} showAssignment />
      </DashboardCard>
    );
  }

  const [students, announcements] = await Promise.all([
    getAsUser<CohortStudent[]>(`/api/teach/cohorts/${cohort.id}/students`),
    getAsUser<AnnouncementView[]>(`/api/teach/cohorts/${cohort.id}/announcements`),
  ]);
  return (
    <>
      <DashboardCard title={t('cohort.studentsTitle')}>
        <CohortStudents cohortId={cohort.id} students={students} />
      </DashboardCard>
      <DashboardCard title={t('cohort.announcementsTitle')}>
        <AnnouncementList items={announcements} emptyText={t('announcements.empty')} />
      </DashboardCard>
    </>
  );
}
