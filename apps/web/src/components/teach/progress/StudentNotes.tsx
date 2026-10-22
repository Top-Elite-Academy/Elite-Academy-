'use client';

import { STUDENT_NOTE_MAX, studentNoteSchema, type StudentNoteView } from '@eta/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { CheckboxField } from '@/components/forms/CheckboxField';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { useApiForm } from '@/components/forms/use-api-form';
import { Badge } from '@/components/ui/Badge';
import { apiRequest } from '@/lib/api/client';

/** Instructor notes (design "Instructor 3"): staff only, never shown to the student. */
export function StudentNotes({
  cohortId,
  studentId,
  initial,
}: {
  cohortId: string;
  studentId: string;
  initial: StudentNoteView[];
}) {
  const t = useTranslations('TeachProgress.student.notes');
  const format = useFormatter();
  const [notes, setNotes] = useState(initial);
  /** Counts saved notes: a new form key empties the form after each save. */
  const [saved, setSaved] = useState(0);
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(studentNoteSchema);

  const submit = onSubmit(
    async (data) => {
      setNotes(
        await apiRequest<StudentNoteView[]>(
          'POST',
          `/api/teach/cohorts/${cohortId}/students/${studentId}/notes`,
          data,
        ),
      );
      setSaved((count) => count + 1);
    },
    { booleanFields: ['sharedWithAdmissions'] },
  );

  return (
    <div className="flex flex-col gap-4">
      {notes.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-[var(--radius-control)] bg-cream p-3 text-sm">
              <p className="whitespace-pre-line text-ink">{note.body}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                {t('by', {
                  name: note.authorName,
                  date: format.dateTime(new Date(note.createdAt), {
                    day: 'numeric',
                    month: 'short',
                    timeZone: 'Asia/Jerusalem',
                    numberingSystem: 'latn',
                  }),
                })}
                {note.sharedWithAdmissions && <Badge tone="slate">{t('shared')}</Badge>}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form
        // A new key after each saved note gives an empty form.
        key={saved}
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-3 border-t border-border pt-4"
      >
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <TextAreaField
          name="body"
          label={t('add')}
          placeholder={t('placeholder')}
          rows={3}
          maxLength={STUDENT_NOTE_MAX}
          required
          error={fieldErrors['body']}
        />
        <CheckboxField name="sharedWithAdmissions" label={t('share')} />
        <div className="sm:max-w-48">
          <SubmitButton submitting={submitting}>{t('save')}</SubmitButton>
        </div>
        <p className="text-xs text-ink-muted">{t('hint')}</p>
      </form>
    </div>
  );
}
