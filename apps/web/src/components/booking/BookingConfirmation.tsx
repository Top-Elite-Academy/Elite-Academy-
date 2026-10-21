'use client';

import type { BookingView, CheckoutResponse, Locale } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { Button, ButtonLink, buttonClasses } from '@/components/ui/Button';
import { CalendarIcon, CheckCircleIcon } from '@/components/ui/icons';
import { bookingPath, ROUTES } from '@/config/navigation';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { useMoney } from '@/lib/format/use-money';
import { BookingProgress } from './BookingProgress';
import { holdExpired, isAwaitingPayment, useBooking } from './use-booking';
import { useServiceText } from './use-service-text';

/**
 * Step 5 (spec §3.7): follows the booking until the payment provider's webhook
 * settles it, then shows the confirmation — or why it failed and how to retry.
 */
export function BookingConfirmation({ bookingId }: { bookingId: string }) {
  const t = useTranslations();
  const state = useBooking(bookingId, { poll: true });

  if (state.status === 'error') {
    const key = `errors.${state.code}`;
    return (
      <FormAlert tone="error">
        {t.has(key) ? t(key as 'errors.generic') : t('errors.generic')}
      </FormAlert>
    );
  }
  if (state.status === 'loading' || isAwaitingPayment(state.booking)) {
    return (
      <Outcome step="payment" title={t('Booking.confirmation.waiting')}>
        <p role="status" className="mt-2 text-ink-muted">
          {t('Booking.confirmation.waitingBody')}
        </p>
      </Outcome>
    );
  }
  const { booking } = state;
  if (booking.status === 'confirmed' || booking.status === 'completed')
    return <Confirmed booking={booking} />;
  if (holdExpired(booking)) return <Expired booking={booking} />;
  return <Failed booking={booking} />;
}

/** Shared frame: progress bar and a heading that takes focus when the outcome changes. */
function Outcome({
  step,
  title,
  icon,
  children,
}: {
  step: 'payment' | 'confirmation';
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [firstTitle] = useState(title);
  useEffect(() => {
    if (title !== firstTitle) heading.current?.focus();
  }, [title, firstTitle]);

  return (
    <div className="mx-auto max-w-2xl">
      <BookingProgress current={step} />
      <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-sm sm:p-8">
        {icon}
        <h1
          ref={heading}
          tabIndex={-1}
          className="font-display text-3xl font-semibold text-ink focus:outline-none"
        >
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

function Confirmed({ booking }: { booking: BookingView }) {
  const t = useTranslations('Booking');
  const text = useServiceText();
  const when = useBookingFormat();
  const money = useMoney();

  return (
    <Outcome
      step="confirmation"
      title={t('confirmation.title')}
      icon={<CheckCircleIcon className="mb-3 size-10 text-success" />}
    >
      <p className="mt-2 text-ink-muted">{t('confirmation.body')}</p>
      <dl className="mt-6 grid gap-4 border-y border-border py-5 text-sm sm:grid-cols-2">
        <Fact label={t('summary.service')}>{text.title(booking.service)}</Fact>
        <Fact label={t('summary.mentor')}>{booking.mentor.name}</Fact>
        <Fact label={t('summary.when')}>
          {when.longDay(booking.startAt)} · <span dir="ltr">{when.time(booking.startAt)}</span> (
          {t('zone.jerusalem')})
        </Fact>
        <Fact label={t('summary.total')}>{money(booking.amountAgorot)}</Fact>
      </dl>
      {booking.creditsLeft !== null && booking.creditsLeft > 0 && (
        <p className="mt-4 font-semibold text-ink">
          {t('confirmation.credits', { count: booking.creditsLeft })}
        </p>
      )}
      <h2 className="mt-6 font-semibold text-ink">{t('confirmation.next')}</h2>
      <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-ink-muted">
        <li>{t('confirmation.nextItems.reminder')}</li>
        <li>{t('confirmation.nextItems.link')}</li>
        <li>{t('confirmation.nextItems.change')}</li>
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={ROUTES.account}>{t('confirmation.dashboard')}</ButtonLink>
        {/* A file download from the API, not a page: a plain link. */}
        <a
          href={`/api/bookings/${booking.id}/calendar.ics`}
          download
          className={buttonClasses({ variant: 'secondary' })}
        >
          <CalendarIcon className="size-4" />
          {t('confirmation.calendar')}
        </a>
      </div>
    </Outcome>
  );
}

function Failed({ booking }: { booking: BookingView }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reasonKey = `Booking.confirmation.reasons.${booking.failureReason ?? 'failed'}`;
  const reason = t.has(reasonKey)
    ? t(reasonKey as 'Booking.confirmation.reasons.failed')
    : t('Booking.confirmation.reasons.failed');

  const retry = async () => {
    setBusy(true);
    try {
      const { redirectUrl } = await apiRequest<CheckoutResponse>(
        'POST',
        `/api/bookings/${booking.id}/checkout`,
        { locale },
      );
      window.location.assign(redirectUrl);
    } catch (caught) {
      const key = `errors.${caught instanceof ApiError ? caught.code : 'generic'}`;
      setError(t.has(key) ? t(key as 'errors.generic') : t('errors.generic'));
      setBusy(false);
    }
  };

  return (
    <Outcome step="payment" title={t('Booking.confirmation.failedTitle')}>
      <p className="mt-2 text-ink-muted">{t('Booking.confirmation.failedBody', { reason })}</p>
      {error && (
        <div className="mt-4">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
      )}
      <div className="mt-6">
        <Button size="lg" disabled={busy} onClick={() => void retry()}>
          {t('Booking.confirmation.tryAgain')}
        </Button>
      </div>
    </Outcome>
  );
}

function Expired({ booking }: { booking: BookingView }) {
  const t = useTranslations('Booking.confirmation');
  const query = new URLSearchParams({
    service: booking.service,
    mentor: booking.mentor.id,
    step: 'datetime',
  });
  return (
    <Outcome step="payment" title={t('expiredTitle')}>
      <p className="mt-2 text-ink-muted">{t('expiredBody')}</p>
      <div className="mt-6">
        <ButtonLink href={bookingPath(query.toString())}>{t('chooseAgain')}</ButtonLink>
      </div>
    </Outcome>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{children}</dd>
    </div>
  );
}
