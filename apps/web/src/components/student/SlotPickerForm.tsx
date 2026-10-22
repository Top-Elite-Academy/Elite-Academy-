'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DateTimeStep } from '@/components/booking/DateTimeStep';
import { FormAlert } from '@/components/forms/FormAlert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { STUDENT_ROUTES } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';

/**
 * Pick one of the mentor's free times and send it (reschedule, or book the next
 * meeting from a plan). The server checks the time is still free.
 */
export function SlotPickerForm({
  mentorId,
  service,
  endpoint,
  submitLabel,
  done,
}: {
  mentorId: string;
  service: string;
  endpoint: `/api/${string}`;
  submitLabel: string;
  /** Shown on the Sessions page afterwards. */
  done: 'rescheduled' | 'booked';
}) {
  const t = useTranslations();
  const router = useRouter();
  const [startAt, setStartAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!startAt) {
      setError(t('StudentSessionChanges.chooseTime'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest('POST', endpoint, { startAt });
      router.push(`${STUDENT_ROUTES.sessions}?done=${done}`);
      router.refresh();
    } catch (caught) {
      const key = `errors.${caught instanceof ApiError ? caught.code : 'generic'}`;
      setError(t.has(key) ? t(key as 'errors.generic') : t('errors.generic'));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <DateTimeStep
        mentorId={mentorId}
        service={service}
        startAt={startAt}
        onTime={(value) => {
          setStartAt(value);
          setError(null);
        }}
      />
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <div className="flex flex-wrap gap-3">
        <Button size="lg" disabled={busy} onClick={() => void submit()}>
          {submitLabel}
        </Button>
        <ButtonLink href={STUDENT_ROUTES.sessions} variant="secondary" size="lg">
          {t('StudentSessionChanges.back')}
        </ButtonLink>
      </div>
    </div>
  );
}
