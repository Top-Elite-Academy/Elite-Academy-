import type { TeachToday } from '@eta/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DashboardCard } from '@/components/student/DashboardCard';
import { AnnouncementDialog } from '@/components/teach/AnnouncementDialog';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { ScheduleList } from '@/components/teach/ScheduleList';
import { StatCard } from '@/components/teach/StatCard';
import { TodayHeading } from '@/components/teach/TodayHeading';
import { TEACH_ROUTES } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { requireUser } from '@/lib/auth/require-user';
import { jerusalemNow } from '@/lib/format/jerusalem-now';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Teach.nav');
  return { title: t('today') };
}

/** Instructor "Today" (design "Instructor 1"). */
export default async function TeachTodayPage() {
  const [user, today, t] = await Promise.all([
    requireUser(TEACH_ROUTES.today, ['instructor', 'mentor', 'admin']),
    getAsUser<TeachToday>('/api/teach/today'),
    getTranslations('Teach'),
  ]);
  const now = jerusalemNow();
  const running = today.cohorts.filter((cohort) => cohort.week !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TodayHeading firstName={user.firstName} now={now} running={running} />
        <AnnouncementDialog
          cohorts={today.cohorts.map((cohort) => ({
            id: cohort.id,
            label: `${cohort.name} · ${cohort.program.title}`,
          }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t('stats.students')}
          value={today.stats.students}
          note={t('stats.pending', { count: today.stats.pending })}
        />
        <StatCard label={t('stats.sessions')} value={today.stats.sessionsThisWeek} />
        <StatCard
          label={t('stats.cohorts')}
          value={today.cohorts.length}
          note={t('stats.cohortsNote', { count: running.length })}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <DashboardCard title={t('schedule.title')} className="lg:col-span-3">
          <ScheduleList items={today.schedule} today={now.isoDate} />
        </DashboardCard>
        <DashboardCard title={t('announcements.title')} className="lg:col-span-2">
          <AnnouncementList items={today.announcements} emptyText={t('announcements.empty')} />
        </DashboardCard>
      </div>
    </div>
  );
}
