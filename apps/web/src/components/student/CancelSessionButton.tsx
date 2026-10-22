'use client';

import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/** "Cancel" with a confirmation saying what happens to the session (plan credit or refund). */
export function CancelSessionButton({
  bookingId,
  fromPlan,
  description,
}: {
  bookingId: string;
  fromPlan: boolean;
  /** Which session, for screen readers. */
  description: string;
}) {
  const t = useTranslations('StudentSessionChanges');
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={t('cancel')}
      triggerVariant="ghost"
      srContext={description}
      title={t('cancelTitle')}
      body={t(fromPlan ? 'cancelPlan' : 'cancelSingle')}
      cancelLabel={t('keep')}
      confirmLabel={t('confirmCancel')}
      onConfirm={async () => {
        await apiRequest('POST', `/api/me/sessions/${bookingId}/cancel`, {});
        router.refresh();
      }}
    />
  );
}
