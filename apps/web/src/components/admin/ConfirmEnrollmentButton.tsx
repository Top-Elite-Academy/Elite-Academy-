'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';

/** Confirms one waiting student; the server takes the seat and notifies them. */
export function ConfirmEnrollmentButton({
  enrollmentId,
  name,
}: {
  enrollmentId: string;
  name: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setState('busy');
    setError(null);
    try {
      await apiRequest('POST', `/api/enrollments/${enrollmentId}/confirm`, {});
      setState('done');
      router.refresh();
    } catch (caught) {
      const key = `errors.${caught instanceof ApiError ? caught.code : 'generic'}`;
      setError(t.has(key) ? t(key as 'errors.generic') : t('errors.generic'));
      setState('idle');
    }
  };

  if (state === 'done')
    return (
      <p role="status" className="text-sm font-semibold text-success">
        {t('AdminEnrollments.confirmed')}
      </p>
    );
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button size="sm" disabled={state === 'busy'} onClick={() => void confirm()}>
        {t('AdminEnrollments.confirm')}
        <span className="sr-only">{`: ${name}`}</span>
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
