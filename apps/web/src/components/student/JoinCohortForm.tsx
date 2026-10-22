'use client';

import { type CohortRef, requestEnrollmentSchema } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { SelectField } from '@/components/forms/SelectField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useApiForm } from '@/components/forms/use-api-form';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

/** "Join a cohort": the student asks; admin or sales confirm (product decision). */
export function JoinCohortForm({ cohorts }: { cohorts: CohortRef[] }) {
  const t = useTranslations('StudentCourses');
  const dates = useCohortFormat();
  const router = useRouter();
  const [joined, setJoined] = useState(false);
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(requestEnrollmentSchema);

  const submit = onSubmit(async (data) => {
    await apiRequest('POST', '/api/me/enrollments', data);
    setJoined(true);
    router.refresh();
  });

  if (cohorts.length === 0) return <p className="text-ink-muted">{t('noCohorts')}</p>;

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      {joined && <FormAlert tone="success">{t('joined')}</FormAlert>}
      <SelectField
        name="cohortId"
        label={t('cohortLabel')}
        options={cohorts.map((cohort) => ({
          value: cohort.id,
          label: `${cohort.program.title} · ${cohort.name} · ${t('startsOn', {
            date: dates.longDate(cohort.startDate),
          })}`,
        }))}
        error={fieldErrors['cohortId']}
      />
      <div className="sm:max-w-60">
        <SubmitButton submitting={submitting}>{t('join')}</SubmitButton>
      </div>
    </form>
  );
}
