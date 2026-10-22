import type { MentorAvailability, MentorSessions } from '@eta/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DashboardCard, EmptyState } from '@/components/student/DashboardCard';
import { AvailabilityEditor } from '@/components/teach/sessions/AvailabilityEditor';
import { SessionNotesForm } from '@/components/teach/sessions/SessionNotesForm';
import { TimeOffPanel } from '@/components/teach/sessions/TimeOffPanel';
import { UpcomingSessions } from '@/components/teach/sessions/UpcomingSessions';
import { Badge } from '@/components/ui/Badge';
import { InfoIcon } from '@/components/ui/icons';
import { getAsUser } from '@/lib/api/server';
import { jerusalemNow } from '@/lib/format/jerusalem-now';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TeachSessions');
  return { title: t('metaTitle') };
}

/** Sessions & availability (design "Instructor 5"). */
export default async function TeachSessionsPage() {
  const [availability, sessions, t, tErrors] = await Promise.all([
    getAsUser<MentorAvailability>('/api/teach/availability').catch(() => null),
    getAsUser<MentorSessions>('/api/teach/sessions').catch(() => null),
    getTranslations('TeachSessions'),
    getTranslations('errors'),
  ]);

  // An instructor account without a mentor profile: explain instead of failing.
  if (!availability || !sessions) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
        <div className="mt-6">
          <EmptyState text={tErrors('mentor.notLinked')} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('intro')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <DashboardCard
          title={t('upcoming.title')}
          className="lg:col-span-3"
          action={<span className="text-sm text-ink-muted">{t('upcoming.range')}</span>}
        >
          <UpcomingSessions sessions={sessions.upcoming} today={jerusalemNow().isoDate} />
          <div className="mt-4 flex gap-3 rounded-[var(--radius-control)] border border-slate-700/30 bg-slate-100 p-4 text-sm">
            <InfoIcon className="mt-0.5 size-5 text-slate-700" />
            <div>
              <p className="font-semibold text-ink">{t('upcoming.policyTitle')}</p>
              <p className="text-ink">{t('upcoming.policy')}</p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title={t('notes.title')}
          className="lg:col-span-2"
          action={
            sessions.needsNotes.length > 0 && (
              <Badge tone="gold">{t('notes.missing', { count: sessions.needsNotes.length })}</Badge>
            )
          }
        >
          {sessions.needsNotes.length === 0 ? (
            <p className="text-ink-muted">{t('notes.allDone')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {sessions.needsNotes.map((session) => (
                <li key={session.id} className="py-4 first:pt-0 last:pb-0">
                  <SessionNotesForm session={session} />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      <DashboardCard title={t('grid.title')}>
        <p className="-mt-2 mb-4 text-sm text-ink-muted">{t('grid.intro')}</p>
        <AvailabilityEditor availability={availability} />
      </DashboardCard>

      <DashboardCard title={t('timeOff.title')}>
        <TimeOffPanel ranges={availability.timeOff} />
      </DashboardCard>
    </div>
  );
}
