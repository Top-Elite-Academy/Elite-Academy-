import type { StudentSession } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { DashboardCard } from '@/components/student/DashboardCard';
import { SlotPickerForm } from '@/components/student/SlotPickerForm';
import { getAsUser } from '@/lib/api/server';
import { isBookingId } from '@/lib/booking/booking-state';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('StudentSessionChanges');
  return { title: t('rescheduleTitle') };
}

/** Reschedule one of the student's sessions (spec §4.5), until 24 hours before and while moves are left. */
export default async function RescheduleSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isBookingId(id)) notFound();
  const [sessions, t, format] = await Promise.all([
    getAsUser<StudentSession[]>('/api/me/sessions?scope=upcoming'),
    getTranslations('StudentSessionChanges'),
    getFormatter(),
  ]);
  const session = sessions.find((item) => item.id === id && item.canReschedule);
  if (!session) notFound();

  const when = format.dateTime(new Date(session.startAt), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jerusalem',
    numberingSystem: 'latn',
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{t('rescheduleTitle')}</h1>
      <DashboardCard title={t('rescheduleTitle')}>
        <p className="mb-6 text-ink-muted">
          {t('rescheduleIntro', { name: session.mentor.name, when })}
        </p>
        <SlotPickerForm
          mentorId={session.mentor.id}
          service={session.service}
          endpoint={`/api/me/sessions/${session.id}/reschedule`}
          submitLabel={t('rescheduleSave')}
          done="rescheduled"
        />
      </DashboardCard>
    </div>
  );
}
