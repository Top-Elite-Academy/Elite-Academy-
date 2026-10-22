import type { TeachCohort } from '@eta/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/student/DashboardCard';
import { CohortCard } from '@/components/teach/CohortCard';
import { getAsUser } from '@/lib/api/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Teach.cohorts');
  return { title: t('metaTitle') };
}

/** The instructor's cohorts. */
export default async function TeachCohortsPage() {
  const [cohorts, t] = await Promise.all([
    getAsUser<TeachCohort[]>('/api/teach/cohorts'),
    getTranslations('Teach.cohorts'),
  ]);
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
      <div className="mt-6">
        {cohorts.length === 0 ? (
          <EmptyState text={t('empty')} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {cohorts.map((cohort) => (
              <li key={cohort.id}>
                <CohortCard cohort={cohort} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
