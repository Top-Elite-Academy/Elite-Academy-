'use client';

import { MESSAGE_MAX, type Recipient, startConversationSchema, SUBJECT_MAX } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { SelectField } from '@/components/forms/SelectField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { TextField } from '@/components/forms/TextField';
import { useApiForm } from '@/components/forms/use-api-form';
import { Button } from '@/components/ui/Button';
import { CloseIcon, PlusIcon } from '@/components/ui/icons';
import { messagesPath } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useCounterpartName } from './use-counterpart-name';

const keyOf = (recipient: Recipient) =>
  recipient.kind === 'team' ? recipient.team : recipient.userId;

/** "New message": choose someone from the allowed list (spec §4.9), write, send. */
export function NewMessageDialog({
  base,
  recipients,
  initialTo,
}: {
  base: string;
  recipients: Recipient[];
  /** Opens the dialog with this recipient chosen (e.g. "Contact support"). */
  initialTo?: string;
}) {
  const t = useTranslations('Messages.new');
  const name = useCounterpartName();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(startConversationSchema);
  const preselected = recipients.find((recipient) => keyOf(recipient) === initialTo);

  useEffect(() => {
    if (preselected) dialogRef.current?.showModal();
  }, [preselected]);

  const [sentTo, setSentTo] = useState<string | null>(null);

  // After sending: close the dialog and open the thread.
  useEffect(() => {
    if (!sentTo) return;
    dialogRef.current?.close();
    router.push(messagesPath(base, { thread: sentTo }));
    router.refresh();
  }, [sentTo, base, router]);

  const submit = onSubmit(async (data) => {
    const { id } = await apiRequest<{ id: string }>('POST', '/api/messages/conversations', data);
    setSentTo(id);
  });

  if (recipients.length === 0) return null;
  return (
    <>
      <Button aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
        <PlusIcon className="size-4" aria-hidden="true" />
        {t('button')}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="new-message-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-card)] bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-5 p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="new-message-title" className="text-xl font-bold">
              {t('title')}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-sand"
            >
              <CloseIcon className="size-5" aria-hidden="true" />
              <span className="sr-only">{t('cancel')}</span>
            </button>
          </div>
          {formError && <FormAlert tone="error">{formError}</FormAlert>}
          <SelectField
            name="to"
            label={t('to')}
            defaultValue={preselected ? keyOf(preselected) : undefined}
            options={recipients.map((recipient) => ({
              value: keyOf(recipient),
              label:
                recipient.kind === 'person' && recipient.context
                  ? `${name(recipient)} · ${recipient.context}`
                  : name(recipient),
            }))}
            error={fieldErrors['to']}
          />
          <TextField
            name="subject"
            label={t('subject')}
            optionalText={t('optional')}
            maxLength={SUBJECT_MAX}
            error={fieldErrors['subject']}
          />
          <TextAreaField
            name="body"
            label={t('body')}
            rows={5}
            maxLength={MESSAGE_MAX}
            required
            error={fieldErrors['body']}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
              {t('cancel')}
            </Button>
            <div className="min-w-40">
              <SubmitButton submitting={submitting}>{t('send')}</SubmitButton>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
