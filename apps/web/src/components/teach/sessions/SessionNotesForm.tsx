'use client';

import { type MentorSession, SESSION_NOTES_MAX, sessionOutcomeSchema } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { RadioCard } from '@/components/booking/RadioCard';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { useApiForm } from '@/components/forms/use-api-form';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useBookingFormat } from '@/lib/format/use-booking-format';

const OUTCOMES = ['held', 'no_show'] as const;

/** After a session: what happened, and notes the student will see (design "Instructor 5"). */
export function SessionNotesForm({ session }: { session: MentorSession }) {
  const t = useTranslations('TeachSessions.notes');
  const when = useBookingFormat();
  const router = useRouter();
  const [outcome, setOutcome] = useState<'held' | 'no_show'>('held');
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(sessionOutcomeSchema);

  // The radio cards have per-session names, so the choice is passed explicitly.
  const submit = onSubmit(
    async (data) => {
      await apiRequest('POST', `/api/teach/sessions/${session.id}/outcome`, data);
      router.refresh();
    },
    { extra: { outcome } },
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <div>
        <p className="font-semibold text-ink">
          {`${session.student.firstName} ${session.student.lastName}`}
        </p>
        <p className="text-sm text-ink-muted">
          {when.longDay(session.startAt)} · <span dir="ltr">{when.time(session.startAt)}</span>
        </p>
      </div>
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <fieldset>
        <legend className="text-sm font-semibold text-ink">{t('outcome')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {OUTCOMES.map((value) => (
            <RadioCard
              key={value}
              name={`outcome-${session.id}`}
              value={value}
              checked={outcome === value}
              onSelect={() => {
                setOutcome(value);
              }}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink"
            >
              {t(value === 'held' ? 'held' : 'noShow')}
            </RadioCard>
          ))}
        </div>
      </fieldset>
      <TextAreaField
        name="notes"
        label={t('covered')}
        placeholder={t('placeholder')}
        rows={4}
        maxLength={SESSION_NOTES_MAX}
        required={outcome === 'held'}
        error={fieldErrors['notes']}
      />
      <div className="sm:max-w-64">
        <SubmitButton submitting={submitting}>{t('save')}</SubmitButton>
      </div>
      <p className="text-xs text-ink-muted">{t('noShowNote')}</p>
    </form>
  );
}
