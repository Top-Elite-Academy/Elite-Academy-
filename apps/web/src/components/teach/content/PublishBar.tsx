'use client';

import type { TeachLesson } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { teachContentPath } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';

/** Publish / back to draft, and deleting a draft (design "Instructor 6", bottom of the editor). */
export function PublishBar({ lesson }: { lesson: TeachLesson }) {
  const t = useTranslations('TeachContent.editor');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const isDraft = lesson.status === 'draft';

  const setPublished = async (publish: boolean) => {
    setBusy(true);
    setStatus(null);
    try {
      await apiRequest(
        'POST',
        `/api/teach/lessons/${lesson.id}/${publish ? 'publish' : 'unpublish'}`,
        {},
      );
      setStatus({ tone: 'success', text: publish ? t('published') : t('saved') });
      router.refresh();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : 'generic';
      setStatus({
        tone: 'error',
        text: tErrors.has(code) ? tErrors(code as 'generic') : tErrors('generic'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5">
      {status && <FormAlert tone={status.tone}>{status.text}</FormAlert>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isDraft ? (
          <ConfirmDialog
            trigger={t('delete')}
            triggerVariant="ghost"
            title={t('deleteTitle')}
            body={t('deleteBody')}
            cancelLabel={t('keep')}
            confirmLabel={t('confirmDelete')}
            onConfirm={async () => {
              await apiRequest('DELETE', `/api/teach/lessons/${lesson.id}`);
              router.push(teachContentPath(lesson.programId));
              router.refresh();
            }}
          />
        ) : (
          <span />
        )}
        <div className="flex flex-col items-start gap-1 sm:items-end">
          {isDraft ? (
            <Button disabled={!lesson.canPublish || busy} onClick={() => void setPublished(true)}>
              {t('publish')}
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => void setPublished(false)}>
              {t('unpublish')}
            </Button>
          )}
          {isDraft && !lesson.canPublish && (
            <p className="text-xs text-ink-muted">{t('notReady')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
