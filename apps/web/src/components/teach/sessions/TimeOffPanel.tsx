'use client';

import { type MentorAvailability, timeOffSchema } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { useApiForm } from '@/components/forms/use-api-form';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

/** Days away: no bookings in that period (design "Instructor 5" Time off). */
export function TimeOffPanel({ ranges }: { ranges: MentorAvailability['timeOff'] }) {
  const t = useTranslations('TeachSessions.timeOff');
  const dates = useCohortFormat();
  const router = useRouter();
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(timeOffSchema);

  const submit = onSubmit(async (data) => {
    await apiRequest('POST', '/api/teach/time-off', data);
    router.refresh();
  });

  const remove = async (id: string) => {
    await apiRequest('DELETE', `/api/teach/time-off/${id}`);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {ranges.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ranges.map((range) => {
            const label = `${dates.dayMonth(range.startDate)} – ${dates.dayMonth(range.endDate)}`;
            return (
              <li key={range.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">
                  {label} · {t('noBookings')}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void remove(range.id)}>
                  {t('remove')}
                  <span className="sr-only">{`: ${t('removeLabel', { range: label })}`}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <div className="grid grid-cols-2 gap-3">
          <TextField
            name="startDate"
            type="date"
            label={t('from')}
            required
            ltr
            error={fieldErrors['startDate']}
          />
          <TextField
            name="endDate"
            type="date"
            label={t('to')}
            required
            ltr
            error={fieldErrors['endDate']}
          />
        </div>
        <div className="sm:max-w-48">
          <SubmitButton submitting={submitting}>{t('add')}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
