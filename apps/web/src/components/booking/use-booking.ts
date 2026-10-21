'use client';

import type { BookingView } from '@eta/shared';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';

const POLL_MS = 2_000;
/** Stop asking after this long; the page keeps showing "confirming" and the email still arrives. */
const POLL_LIMIT_MS = 2 * 60_000;

type State =
  | { status: 'loading' }
  | { status: 'ready'; booking: BookingView }
  | { status: 'error'; code: string };

/** Payment outcome not known yet: the provider's webhook has not arrived. */
export const isAwaitingPayment = (booking: BookingView) =>
  booking.status === 'held' && booking.paymentStatus !== 'failed' && !holdExpired(booking);

export const holdExpired = (booking: BookingView) =>
  booking.status === 'cancelled' ||
  (booking.status === 'held' &&
    booking.holdExpiresAt !== null &&
    Date.parse(booking.holdExpiresAt) <= Date.now());

/**
 * The signed-in user's booking. With `poll`, asks again every 2 seconds while
 * the payment is still being confirmed (the webhook decides, never this page).
 */
export function useBooking(bookingId: string, { poll = false } = {}): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const load = async () => {
      try {
        const booking = await apiRequest<BookingView>('GET', `/api/bookings/${bookingId}`);
        if (stopped) return;
        setState({ status: 'ready', booking });
        if (poll && isAwaitingPayment(booking) && Date.now() - startedAt < POLL_LIMIT_MS) {
          timer = setTimeout(() => void load(), POLL_MS);
        }
      } catch (error) {
        if (!stopped)
          setState({ status: 'error', code: error instanceof ApiError ? error.code : 'generic' });
      }
    };
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [bookingId, poll]);

  return state;
}
