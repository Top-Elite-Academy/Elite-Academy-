'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/** Instructor tools for a whole question: pin it, or keep its reported posts. */
export function ModeratorBar({
  threadId,
  pinned,
  openReports,
}: {
  threadId: string;
  pinned: boolean;
  openReports: number;
}) {
  const t = useTranslations('Discussion');
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={busy}
        aria-pressed={pinned}
        onClick={() =>
          void run(() => apiRequest('PATCH', `/api/discussions/${threadId}`, { pinned: !pinned }))
        }
      >
        {pinned ? t('unpin') : t('pin')}
      </Button>
      {openReports > 0 && (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() =>
            void run(() => apiRequest('POST', `/api/discussions/${threadId}/reports/dismiss`, {}))
          }
        >
          {t('keepReported', { count: openReports })}
        </Button>
      )}
    </div>
  );
}
