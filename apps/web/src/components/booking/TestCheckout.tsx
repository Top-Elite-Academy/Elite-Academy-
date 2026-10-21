'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { Button } from '@/components/ui/Button';
import { bookingConfirmationPath } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';
import { useMoney } from '@/lib/format/use-money';
import { useBooking } from './use-booking';

/**
 * Development stand-in for the payment provider's hosted page. The buttons ask
 * the API to send itself a signed webhook — the same path a real payment takes.
 */
export function TestCheckout({ bookingId }: { bookingId: string }) {
  const t = useTranslations();
  const money = useMoney();
  const router = useRouter();
  const state = useBooking(bookingId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pay = async (outcome: 'paid' | 'failed') => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest('POST', `/api/bookings/${bookingId}/test-payment`, { outcome });
      router.push(bookingConfirmationPath(bookingId));
    } catch (caught) {
      const key = `errors.${caught instanceof ApiError ? caught.code : 'generic'}`;
      setError(t.has(key) ? t(key as 'errors.generic') : t('errors.generic'));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] border-2 border-dashed border-gold-500 bg-white p-6 shadow-sm">
      <p className="inline-block rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700">
        {t('Booking.testCheckout.badge')}
      </p>
      <h1 className="mt-4 text-2xl font-bold text-ink">{t('Booking.testCheckout.title')}</h1>
      <p className="mt-2 text-ink-muted">{t('Booking.testCheckout.body')}</p>
      {state.status === 'ready' && (
        <p className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-ink-muted">{t('Booking.testCheckout.amount')}</span>
          <span className="text-2xl font-bold text-ink">{money(state.booking.amountAgorot)}</span>
        </p>
      )}
      {(error ?? state.status === 'error') && (
        <div className="mt-4">
          <FormAlert tone="error">{error ?? t('errors.generic')}</FormAlert>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3">
        <Button size="lg" disabled={busy} onClick={() => void pay('paid')}>
          {t('Booking.testCheckout.pay')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void pay('failed')}>
          {t('Booking.testCheckout.fail')}
        </Button>
      </div>
    </div>
  );
}
