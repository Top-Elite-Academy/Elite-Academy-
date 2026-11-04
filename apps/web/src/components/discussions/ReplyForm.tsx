'use client';

import { DISCUSSION_BODY_MAX, discussionReplySchema } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { useApiForm } from '@/components/forms/use-api-form';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/** Reply at the bottom of a question; the page reloads its posts afterwards. */
export function ReplyForm({ threadId }: { threadId: string }) {
  const t = useTranslations('Discussion');
  const router = useRouter();
  /** Bumped after each reply; the new key gives an empty form. */
  const [sent, setSent] = useState(0);
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(discussionReplySchema);

  const submit = onSubmit(async (data) => {
    await apiRequest('POST', `/api/discussions/${threadId}/replies`, data);
    setSent((value) => value + 1);
    router.refresh();
  });

  return (
    <form
      key={sent}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <TextAreaField
        name="body"
        label={t('yourReply')}
        required
        rows={5}
        maxLength={DISCUSSION_BODY_MAX}
        error={fieldErrors['body']}
      />
      <p className="-mt-2 text-sm text-ink-muted">{t('codeHint')}</p>
      <div className="sm:max-w-56">
        <SubmitButton submitting={submitting}>{t('reply')}</SubmitButton>
      </div>
    </form>
  );
}
