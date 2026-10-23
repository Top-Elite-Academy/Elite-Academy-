'use client';

import { MAX_SUBMISSION_FILES, type StudentAssignment, SUBMISSION_NOTE_MAX } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { ScanBadge } from '@/components/assignments/SubmissionBadges';
import { FormAlert } from '@/components/forms/FormAlert';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { TextField } from '@/components/forms/TextField';
import { Button } from '@/components/ui/Button';
import { CloseIcon } from '@/components/ui/icons';
import { useRouter } from '@/i18n/navigation';
import { apiRequest, apiUpload } from '@/lib/api/client';
import { useErrorMessage } from '@/lib/api/use-error-message';
import { formatFileSize } from '@/lib/format/file-size';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.txt,.md,.json,.ipynb,.zip,.py,.js,.ts,.sql';

type Submission = StudentAssignment['submission'];

/** Hand in a GitHub link and/or files (and update them until the work is returned). */
export function HandInForm({ lessonId, submission }: { lessonId: string; submission: Submission }) {
  const t = useTranslations('StudentExercise');
  const errorMessage = useErrorMessage();
  const locale = useLocale();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const kept = submission?.files.length ?? 0;

  const send = async (form: FormData) => {
    setBusy(true);
    setStatus(null);
    try {
      await apiUpload(`/api/me/lessons/${lessonId}/submission`, form);
      if (fileInput.current) fileInput.current.value = '';
      setStatus({ tone: 'success', text: t(submission ? 'updated' : 'sent') });
      router.refresh();
    } catch (caught) {
      setStatus({ tone: 'error', text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  };

  const removeFile = async (fileId: string) => {
    if (!submission) return;
    setStatus(null);
    try {
      await apiRequest('DELETE', `/api/me/submissions/${submission.id}/files/${fileId}`);
      router.refresh();
    } catch (caught) {
      setStatus({ tone: 'error', text: errorMessage(caught) });
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void send(new FormData(event.currentTarget));
      }}
      className="flex flex-col gap-4 border-t border-border pt-4"
    >
      {status && <FormAlert tone={status.tone}>{status.text}</FormAlert>}
      <TextField
        name="repoUrl"
        type="url"
        label={t('repoUrl')}
        hint={t('repoHint')}
        placeholder={t('repoPlaceholder')}
        defaultValue={submission?.repoUrl ?? ''}
        ltr
      />
      {submission && submission.files.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-control)] border border-border">
          {submission.files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span dir="ltr" className="min-w-0 flex-1 break-all text-ink">
                {file.fileName}
              </span>
              <span dir="ltr" className="text-ink-muted">
                {formatFileSize(file.sizeBytes, locale)}
              </span>
              <ScanBadge status={file.scanStatus} />
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('removeFile', { name: file.fileName })}
                onClick={() => {
                  void removeFile(file.id);
                }}
              >
                <CloseIcon className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {kept < MAX_SUBMISSION_FILES && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${lessonId}-files`} className="text-sm font-semibold text-ink">
            {t('files')}
          </label>
          <p id={`${lessonId}-files-hint`} className="text-xs text-ink-muted">
            {t('filesHint', { count: MAX_SUBMISSION_FILES - kept })}
          </p>
          <input
            ref={fileInput}
            id={`${lessonId}-files`}
            name="files"
            type="file"
            multiple
            accept={ACCEPT}
            aria-describedby={`${lessonId}-files-hint`}
            className="text-sm text-ink file:me-3 file:rounded-[var(--radius-control)] file:border file:border-ink/25 file:bg-white file:px-3 file:py-2 file:font-semibold"
          />
        </div>
      )}
      <TextAreaField
        name="note"
        label={t('note')}
        optionalText={t('optional')}
        defaultValue={submission?.note ?? ''}
        rows={3}
        maxLength={SUBMISSION_NOTE_MAX}
      />
      <div>
        <Button type="submit" disabled={busy}>
          {t(submission ? 'update' : 'submit')}
        </Button>
      </div>
    </form>
  );
}
