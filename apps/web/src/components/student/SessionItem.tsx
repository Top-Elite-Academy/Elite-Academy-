import type { StudentSession } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useServiceText } from '@/components/booking/use-service-text';
import { MentorAvatar } from '@/components/mentoring/MentorAvatar';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses, ButtonLink } from '@/components/ui/Button';
import { CalendarIcon } from '@/components/ui/icons';
import { rescheduleSessionPath } from '@/config/navigation';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { CancelSessionButton } from './CancelSessionButton';

/**
 * One session (spec §4.3, §4.5). Upcoming: Join (from 15 minutes before), Add
 * to calendar, and Reschedule (while moves are left) / Cancel until 24 hours
 * before. Past: what
 * happened and the mentor's notes.
 */
export function SessionItem({
  session,
  upcoming,
}: {
  session: StudentSession;
  /** From the upcoming list (Join, calendar, changes) or the past list (what happened). */
  upcoming: boolean;
}) {
  const t = useTranslations('Student.sessions');
  const tChange = useTranslations('StudentSessionChanges');
  const tZone = useTranslations('Booking.zone');
  const service = useServiceText();
  const when = useBookingFormat();
  const description = `${service.title(session.service)}, ${when.longDay(session.startAt)} ${when.time(session.startAt)}`;

  return (
    <article className="rounded-[var(--radius-control)] border border-border p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <MentorAvatar name={session.mentor.name} photoPath={session.mentor.photoPath} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={session.kind === 'career' ? 'slate' : 'sage'}>
              {t(`kinds.${session.kind}`)}
            </Badge>
            {!upcoming && <Badge tone="neutral">{t(`status.${session.status}`)}</Badge>}
            {session.refundRequested && <Badge tone="gold">{tChange('refundRequested')}</Badge>}
          </div>
          <h3 className="mt-1.5 font-semibold text-ink">{service.title(session.service)}</h3>
          <p className="text-sm text-ink-muted">
            {when.longDay(session.startAt)} · <span dir="ltr">{when.time(session.startAt)}</span> ·{' '}
            {tZone('jerusalem')} · {t('with', { name: session.mentor.name })}
          </p>
        </div>
        {upcoming && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {session.joinUrl ? (
              <a
                href={session.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ size: 'sm' })}
              >
                {t('join')}
              </a>
            ) : (
              <span className="text-sm text-ink-muted">
                {t('joinOpens', { time: when.time(session.joinOpensAt) })}
              </span>
            )}
            <a
              href={`/api/bookings/${session.id}/calendar.ics`}
              download
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <CalendarIcon className="size-4" />
              {t('calendar')}
            </a>
          </div>
        )}
      </div>

      {upcoming && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {session.canChange ? (
            <>
              {session.canReschedule && (
                <ButtonLink href={rescheduleSessionPath(session.id)} variant="ghost" size="sm">
                  {tChange('reschedule')}
                  <span className="sr-only">{`: ${description}`}</span>
                </ButtonLink>
              )}
              <CancelSessionButton
                bookingId={session.id}
                fromPlan={session.fromPlan}
                description={description}
              />
              {!session.canReschedule && (
                <p className="text-sm text-ink-muted">{tChange('rescheduleUsed')}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-muted">{tChange('tooLate')}</p>
          )}
        </div>
      )}

      {!upcoming && session.notes && (
        <div className="mt-3 rounded-[var(--radius-control)] bg-cream p-3">
          <p className="text-sm font-semibold text-ink">
            {tChange('notes', { name: session.mentor.name })}
          </p>
          <p className="mt-1 text-sm whitespace-pre-line text-ink">{session.notes}</p>
        </div>
      )}
    </article>
  );
}
