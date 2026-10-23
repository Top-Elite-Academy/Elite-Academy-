import {
  type SubmissionFilter,
  submissionFilterSchema,
  type TeachCohort,
  type TeachSubmission,
  type TeachSubmissionList,
} from '@eta/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/student/DashboardCard';
import { GradingPanel } from '@/components/teach/grading/GradingPanel';
import { SubmissionList } from '@/components/teach/grading/SubmissionList';
import { PillNav } from '@/components/ui/PillNav';
import { teachGradingPath } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { isBookingId } from '@/lib/booking/booking-state';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TeachGrading');
  return { title: t('title') };
}

const single = (value: string | string[] | undefined) => (typeof value === 'string' ? value : null);

/** Grading (design "Instructor 4"): hand-ins of a cohort and the rubric panel. */
export default async function TeachGradingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const [cohorts, t] = await Promise.all([
    getAsUser<TeachCohort[]>('/api/teach/cohorts'),
    getTranslations('TeachGrading'),
  ]);
  const cohort =
    cohorts.find((item) => item.id === single(query['cohort'])) ??
    cohorts.find((item) => item.status === 'running') ??
    cohorts[0];

  if (!cohort) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
        <div className="mt-6">
          <EmptyState text={t('noCohorts')} />
        </div>
      </div>
    );
  }

  const status: SubmissionFilter = submissionFilterSchema.catch('to_grade').parse(query['status']);
  const submissionId = single(query['submission']);
  const [list, submission] = await Promise.all([
    getAsUser<TeachSubmissionList>(`/api/teach/cohorts/${cohort.id}/submissions?status=${status}`),
    submissionId && isBookingId(submissionId)
      ? getAsUser<TeachSubmission>(`/api/teach/submissions/${submissionId}`).catch(() => null)
      : Promise.resolve(null),
  ]);
  const filters: { value: SubmissionFilter; label: string }[] = [
    { value: 'to_grade', label: t('filters.toGrade', { count: list.counts.toGrade }) },
    { value: 'returned', label: t('filters.returned', { count: list.counts.returned }) },
    { value: 'all', label: t('filters.all') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('subtitle')}</p>
      </div>

      {cohorts.length > 1 && (
        <PillNav
          label={t('cohort')}
          items={cohorts.map((item) => ({
            key: item.id,
            href: teachGradingPath(item.id),
            label: item.name,
            current: item.id === cohort.id,
          }))}
        />
      )}
      <PillNav
        label={t('filterLabel')}
        items={filters.map((filter) => ({
          key: filter.value,
          href: teachGradingPath(cohort.id, { status: filter.value }),
          label: filter.label,
          current: filter.value === status,
        }))}
      />

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-sm">
          <SubmissionList
            cohortId={cohort.id}
            status={status}
            items={list.items}
            selectedId={submission?.id ?? null}
          />
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm sm:p-6">
          {submission ? (
            // key: another submission (or a refreshed one) starts from its saved grade.
            <GradingPanel
              key={`${submission.id}-${submission.gradedAt ?? ''}-${submission.status}`}
              submission={submission}
            />
          ) : (
            <p className="text-ink-muted">{t('pick')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
