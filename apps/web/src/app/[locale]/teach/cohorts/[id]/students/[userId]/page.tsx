import type { StudentProgress } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { MentorAvatar } from '@/components/mentoring/MentorAvatar';
import { DashboardCard } from '@/components/student/DashboardCard';
import { ProgressBadge } from '@/components/teach/ProgressBadge';
import { MentoringPlanCard } from '@/components/teach/progress/MentoringPlanCard';
import { RecentAttendance } from '@/components/teach/progress/RecentAttendance';
import { StudentNotes } from '@/components/teach/progress/StudentNotes';
import { StatCard } from '@/components/teach/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LockIcon } from '@/components/ui/icons';
import { TEACH_ROUTES, teachCohortPath } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { isBookingId } from '@/lib/booking/booking-state';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TeachProgress.tabs');
  return { title: t('students') };
}

/** A student's progress for their instructor (design "Instructor 3"). */
export default async function TeachStudentPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = await params;
  if (!isBookingId(id) || !isBookingId(userId)) notFound();
  const [progress, t, tTeach, format] = await Promise.all([
    getAsUser<StudentProgress>(`/api/teach/cohorts/${id}/students/${userId}`).catch(() => null),
    getTranslations('TeachProgress'),
    getTranslations('Teach'),
    getFormatter(),
  ]);
  if (!progress) notFound();

  const name = `${progress.student.firstName} ${progress.student.lastName}`;
  const joined = format.dateTime(
    new Date(progress.enrollment.confirmedAt ?? progress.enrollment.requestedAt),
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jerusalem',
      numberingSystem: 'latn',
    },
  );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: tTeach('nav.today'), href: TEACH_ROUTES.today },
          { label: progress.cohort.name, href: teachCohortPath(progress.cohort.id) },
          { label: name },
        ]}
      />

      <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <MentorAvatar name={name} photoPath={null} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink">{name}</h1>
            <ProgressBadge progress={progress.status} />
          </div>
          <p className="text-sm text-ink-muted">
            {`${progress.cohort.program.title} · ${progress.cohort.name} · `}
            {t('student.joined', { date: joined })}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
            <LockIcon className="size-3.5" />
            {t('student.privacy')}
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t('student.stats.attendance')}
          value={progress.attendance.rate === null ? '—' : `${progress.attendance.rate}%`}
          note={t('student.attendedOf', {
            attended: progress.attendance.attended,
            marked: progress.attendance.marked,
          })}
        />
        <StatCard
          label={t('student.stats.lastActive')}
          value={
            progress.lastActiveAt
              ? format.relativeTime(new Date(progress.lastActiveAt))
              : t('never')
          }
        />
        <StatCard
          label={t('student.stats.status')}
          value={<ProgressBadge progress={progress.status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <DashboardCard
            title={t('student.recentTitle', { count: progress.attendance.recent.length })}
          >
            <RecentAttendance recent={progress.attendance.recent} />
          </DashboardCard>
          <DashboardCard title={t('student.laterTitle')}>
            <p className="text-sm text-ink-muted">{t('student.later')}</p>
          </DashboardCard>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          {progress.mentoringPlan && <MentoringPlanCard plan={progress.mentoringPlan} />}
          <DashboardCard
            title={t('student.notes.title')}
            action={
              <Badge tone="neutral" icon={<LockIcon className="size-3.5" />}>
                {t('student.notes.staffOnly')}
              </Badge>
            }
          >
            <StudentNotes cohortId={id} studentId={userId} initial={progress.notes} />
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
