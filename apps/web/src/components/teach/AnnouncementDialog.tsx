'use client';

import { ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX, announcementSchema } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { SelectField } from '@/components/forms/SelectField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { TextField } from '@/components/forms/TextField';
import { useApiForm } from '@/components/forms/use-api-form';
import { Button } from '@/components/ui/Button';
import { CloseIcon, MegaphoneIcon } from '@/components/ui/icons';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

export interface AnnouncementCohort {
  id: string;
  label: string;
}

/**
 * "Post announcement" (design "Instructor 1"): a native modal dialog (focus
 * trapped, Escape closes). Confirmed students of the cohort are notified live.
 */
export function AnnouncementDialog({
  cohorts,
  defaultCohortId,
}: {
  cohorts: AnnouncementCohort[];
  defaultCohortId?: string;
}) {
  const t = useTranslations('Teach.announcements');
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [cohortId, setCohortId] = useState(defaultCohortId ?? cohorts[0]?.id ?? '');
  /** Posted this many times since the page opened (0: nothing to report). */
  const [sentCount, setSentCount] = useState(0);
  const [dialogOpened, setDialogOpened] = useState(0);
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(announcementSchema);

  const submit = onSubmit(async (data) => {
    await apiRequest('POST', `/api/teach/cohorts/${cohortId}/announcements`, data);
    setSentCount((value) => value + 1);
    router.refresh();
  });

  // After posting: empty the form and close the dialog.
  useEffect(() => {
    if (sentCount === 0) return;
    formRef.current?.reset();
    dialogRef.current?.close();
  }, [sentCount]);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        aria-haspopup="dialog"
        disabled={cohorts.length === 0}
        onClick={() => {
          setDialogOpened((value) => value + 1);
          dialogRef.current?.showModal();
        }}
      >
        <MegaphoneIcon className="size-4" />
        {t('send')}
      </Button>
      <p role="status" className="text-sm text-success">
        {sentCount > 0 && sentCount >= dialogOpened ? t('sent') : ''}
      </p>

      <dialog
        ref={dialogRef}
        aria-labelledby="announcement-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-card)] bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-5 p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="announcement-title" className="text-xl font-bold">
              {t('dialogTitle')}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-sand"
            >
              <CloseIcon className="size-5" />
              <span className="sr-only">{t('cancel')}</span>
            </button>
          </div>
          {formError && <FormAlert tone="error">{formError}</FormAlert>}
          {cohorts.length > 1 && (
            <SelectField
              name="cohort"
              label={t('cohort')}
              options={cohorts.map((cohort) => ({ value: cohort.id, label: cohort.label }))}
              value={cohortId}
              onChange={(event) => {
                setCohortId(event.target.value);
              }}
            />
          )}
          <TextField
            name="title"
            label={t('subject')}
            required
            maxLength={ANNOUNCEMENT_TITLE_MAX}
            error={fieldErrors['title']}
          />
          <TextAreaField
            name="body"
            label={t('message')}
            required
            rows={5}
            maxLength={ANNOUNCEMENT_BODY_MAX}
            error={fieldErrors['body']}
          />
          <p className="-mt-2 text-sm text-ink-muted">{t('messageHint')}</p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
              {t('cancel')}
            </Button>
            <div className="min-w-48">
              <SubmitButton submitting={submitting}>{t('send')}</SubmitButton>
            </div>
          </div>
        </form>
      </dialog>
    </div>
  );
}
