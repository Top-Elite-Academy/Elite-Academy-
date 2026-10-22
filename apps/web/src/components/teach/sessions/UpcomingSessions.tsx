'use client';

import type { MentorSession } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UsersIcon } from '@/components/ui/icons';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { addDays } from '@eta/shared';
import { jerusalemDay } from '@/lib/format/jerusalem-now';
import { useBookingFormat } from '@/lib/format/use-booking-format';

/** Sessions in the next 7 days: Join from 15 minutes before; Cancel with a confirmation. */
export function UpcomingSessions({
  sessions,
  today,
}: {
  sessions: MentorSession[];
  today: string;
}) {
  const t = useTranslations('TeachSessions.upcoming');
  const when = useBookingFormat();
  const router = useRouter();

  if (sessions.length === 0) return <p className="text-ink-muted">{t('empty')}</p>;

  const dayLabel = (iso: string) => {
    const day = jerusalemDay(iso);
    if (day === today) return t('today');
    if (day === addDays(today, 1)) return t('tomorrow');
    return when.shortDay(day);
  };

  return (
    <ul className="flex flex-col divide-y divide-border">
      {sessions.map((session) => {
        const name = `${session.student.firstName} ${session.student.lastName}`;
        const badge = session.planPosition
          ? t('plan', session.planPosition)
          : t(session.kind === 'career' ? 'career' : 'single');
        return (
          <li
            key={session.id}
            className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center"
          >
            <div className="w-24 shrink-0 font-mono text-sm">
              <p className="font-semibold text-ink">{dayLabel(session.startAt)}</p>
              <p className="text-ink-muted" dir="ltr">
                {when.time(session.startAt)}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="sage" icon={<UsersIcon className="size-3.5" />}>
                  {badge}
                </Badge>
                <span className="font-semibold text-ink">{name}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {session.joinUrl && (
                <a
                  href={session.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ size: 'sm' })}
                >
                  {t('join')}
                </a>
              )}
              <ConfirmDialog
                trigger={t('cancel')}
                triggerVariant="ghost"
                srContext={`${name}, ${dayLabel(session.startAt)} ${when.time(session.startAt)}`}
                title={t('cancelTitle')}
                body={t('cancelBody', { name })}
                cancelLabel={t('keep')}
                confirmLabel={t('confirmCancel')}
                onConfirm={async () => {
                  await apiRequest('POST', `/api/teach/sessions/${session.id}/cancel`, {});
                  router.refresh();
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
