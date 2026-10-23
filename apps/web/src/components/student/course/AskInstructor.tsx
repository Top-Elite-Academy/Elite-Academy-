'use client';

import { MESSAGE_MAX, type StudentLesson } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { Button, ButtonLink } from '@/components/ui/Button';
import { messagesPath, STUDENT_ROUTES } from '@/config/navigation';
import { apiRequest } from '@/lib/api/client';
import { useErrorMessage } from '@/lib/api/use-error-message';

/** "Ask the instructor" (spec §4.8): the question opens a thread in Messages. */
export function AskInstructor({
  lesson,
  instructor,
}: {
  lesson: StudentLesson;
  instructor: NonNullable<StudentLesson['instructor']>;
}) {
  const t = useTranslations('StudentLesson.ask');
  const errorMessage = useErrorMessage();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (form: HTMLFormElement) => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData(form).get('body');
      const { id } = await apiRequest<{ id: string }>('POST', '/api/messages/conversations', {
        to: instructor.userId,
        subject: t('subject', { number: lesson.position, title: lesson.title }),
        body: typeof body === 'string' ? body : '',
      });
      form.reset();
      setThreadId(id);
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
      className="flex flex-col gap-4"
    >
      {error && <FormAlert tone="error">{error}</FormAlert>}
      {threadId && <FormAlert tone="success">{t('sent')}</FormAlert>}
      <TextAreaField
        name="body"
        label={t('label', { name: `${instructor.firstName} ${instructor.lastName}` })}
        rows={4}
        maxLength={MESSAGE_MAX}
        required
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {t('send')}
        </Button>
        <ButtonLink
          href={messagesPath(STUDENT_ROUTES.messages, threadId ? { thread: threadId } : {})}
          variant="secondary"
        >
          {t('open')}
        </ButtonLink>
      </div>
    </form>
  );
}
