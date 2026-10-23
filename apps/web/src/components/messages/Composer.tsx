'use client';

import { MAX_ATTACHMENTS, MESSAGE_MAX } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { Button } from '@/components/ui/Button';
import { SendIcon } from '@/components/ui/icons';
import { useRouter } from '@/i18n/navigation';
import { apiUpload } from '@/lib/api/client';
import { useErrorMessage } from '@/lib/api/use-error-message';

const ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.json,.csv,.ipynb,.py,.js,.ts,.tsx,.sql,.zip';

/** Write a reply: text up to 2,000 characters and up to three files (scanned). */
export function Composer({ conversationId }: { conversationId: string }) {
  const t = useTranslations('Messages');
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const filesId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (form: HTMLFormElement) => {
    setBusy(true);
    setError(null);
    try {
      await apiUpload(`/api/messages/conversations/${conversationId}/messages`, new FormData(form));
      form.reset();
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void send(event.currentTarget);
      }}
      className="flex flex-col gap-3"
    >
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <TextAreaField name="body" label={t('reply')} rows={3} maxLength={MESSAGE_MAX} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={filesId} className="text-sm font-semibold text-ink">
            {t('attach')}
          </label>
          <input
            id={filesId}
            name="files"
            type="file"
            multiple
            accept={ACCEPT}
            aria-describedby={`${filesId}-hint`}
            className="text-sm text-ink file:me-3 file:rounded-[var(--radius-control)] file:border file:border-ink/25 file:bg-white file:px-3 file:py-2 file:font-semibold"
          />
          <p id={`${filesId}-hint`} className="text-xs text-ink-muted">
            {t('attachHint', { count: MAX_ATTACHMENTS })}
          </p>
        </div>
        <Button type="submit" disabled={busy}>
          <SendIcon className="size-4" aria-hidden="true" />
          {t('send')}
        </Button>
      </div>
    </form>
  );
}
