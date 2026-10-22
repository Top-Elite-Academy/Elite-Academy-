import type { StudentOverview } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { DashboardCard } from '@/components/student/DashboardCard';
import { SlotPickerForm } from '@/components/student/SlotPickerForm';
import { getAsUser } from '@/lib/api/server';
import { isBookingId } from '@/lib/booking/booking-state';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('StudentSessionChanges');
  return { title: t('bookTitle') };
}

/** "Book the next meeting" from a mentoring plan: same mentor, no payment (spec §4.3). */
export default async function BookFromPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const planId = (await searchParams)['plan'];
  if (!isBookingId(planId)) notFound();
  const [overview, t] = await Promise.all([
    getAsUser<StudentOverview>('/api/me/overview'),
    getTranslations('StudentSessionChanges'),
  ]);
  const plan = overview.packages.find((item) => item.id === planId && item.canBook);
  if (!plan?.mentor) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{t('bookTitle')}</h1>
      <DashboardCard title={t('bookTitle')}>
        <p className="mb-6 text-ink-muted">
          {t('bookIntro', { name: plan.mentor.name, left: plan.total - plan.used })}
        </p>
        <SlotPickerForm
          mentorId={plan.mentor.id}
          service={plan.service}
          endpoint={`/api/me/packages/${plan.id}/book`}
          submitLabel={t('bookSave')}
          done="booked"
        />
      </DashboardCard>
    </div>
  );
}
