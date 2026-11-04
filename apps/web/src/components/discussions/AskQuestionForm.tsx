'use client';

import { askQuestionSchema, DISCUSSION_BODY_MAX, DISCUSSION_TITLE_MAX } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { TextField } from '@/components/forms/TextField';
import { useApiForm } from '@/components/forms/use-api-form';
import { studentThreadPath } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/** "Ask a question" under the exercise; opens the new question's page once posted. */
export function AskQuestionForm({
  programSlug,
  lessonId,
}: {
  programSlug: string;
  lessonId: string;
}) {
  const t = useTranslations('Discussion');
  const router = useRouter();
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(askQuestionSchema);

  const submit = onSubmit(async (data) => {
    const { id } = await apiRequest<{ id: string }>(
      'POST',
      `/api/me/lessons/${lessonId}/discussion`,
      data,
    );
    router.push(studentThreadPath(programSlug, lessonId, id));
  });

  return (
    <details className="rounded-[var(--radius-control)] border border-border p-4">
      <summary className="cursor-pointer font-semibold text-crimson-700">{t('ask')}</summary>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="mt-4 flex flex-col gap-4"
      >
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <TextField
          name="title"
          label={t('questionTitle')}
          required
          maxLength={DISCUSSION_TITLE_MAX}
          error={fieldErrors['title']}
        />
        <TextAreaField
          name="body"
          label={t('questionBody')}
          required
          rows={6}
          maxLength={DISCUSSION_BODY_MAX}
          error={fieldErrors['body']}
        />
        <p className="-mt-2 text-sm text-ink-muted">{t('codeHint')}</p>
        <div className="sm:max-w-56">
          <SubmitButton submitting={submitting}>{t('post')}</SubmitButton>
        </div>
      </form>
    </details>
  );
}
