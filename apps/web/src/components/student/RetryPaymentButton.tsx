'use client';

import type { CheckoutResponse, Locale } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api/client';

/** Reopens the provider's payment page for a failed order whose time is still held (spec §4.6). */
export function RetryPaymentButton({ bookingId }: { bookingId: string }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');

  const retry = async () => {
    setState('busy');
    try {
      const { redirectUrl } = await apiRequest<CheckoutResponse>(
        'POST',
        `/api/bookings/${bookingId}/checkout`,
        { locale },
      );
      window.location.assign(redirectUrl);
    } catch {
      setState('error');
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button size="sm" disabled={state === 'busy'} onClick={() => void retry()}>
        {t('Student.payments.tryAgain')}
      </Button>
      {state === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {t('errors.generic')}
        </p>
      )}
    </div>
  );
}
