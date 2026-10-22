import type { PendingEnrollment } from '@eta/shared';
import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ConfirmEnrollmentButton } from '@/components/admin/ConfirmEnrollmentButton';
import { EmptyState } from '@/components/student/DashboardCard';
import { ADMIN_ROUTES } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { requireUser } from '@/lib/auth/require-user';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminEnrollments');
  return { title: t('metaTitle') };
}

/** Admin and sales confirm students once payment is arranged (product decision). */
export default async function AdminEnrollmentsPage() {
  await requireUser(ADMIN_ROUTES.enrollments, ['admin', 'sales']);
  const [pending, t] = await Promise.all([
    getAsUser<PendingEnrollment[]>('/api/enrollments/pending'),
    getTranslations('AdminEnrollments'),
  ]);
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
      <p className="mt-2 text-ink-muted">{t('intro')}</p>
      <div className="mt-6">
        {pending.length === 0 ? (
          <EmptyState text={t('empty')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((row) => (
              <li key={row.id}>
                <PendingRow row={row} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PendingRow({ row }: { row: PendingEnrollment }) {
  const t = useTranslations('AdminEnrollments');
  const dates = useCohortFormat();
  const name = `${row.student.firstName} ${row.student.lastName}`;
  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-semibold text-ink">{name}</h2>
        <p className="text-sm text-ink-muted" dir="ltr">
          {row.student.email}
        </p>
        <p className="text-sm text-ink">
          {`${row.cohort.programTitle} · ${row.cohort.name}`} ·{' '}
          {t('requested', { date: dates.dayMonth(row.requestedAt.slice(0, 10)) })}
        </p>
      </div>
      <ConfirmEnrollmentButton enrollmentId={row.id} name={name} />
    </article>
  );
}
