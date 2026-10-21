'use client';

import { CALL_DAYS, CALL_HOURS, type CallHours } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { ChoiceGroup } from '@/components/forms/ChoiceGroup';

const HOUR_KEYS = Object.keys(CALL_HOURS) as CallHours[];

/** "When can we call you?": days and hour ranges, one or more of each (spec §3.6). */
export function CallTimeFields({ errors }: { errors: Record<string, string> }) {
  const t = useTranslations('Enroll');
  return (
    <div className="space-y-5">
      <ChoiceGroup
        name="days"
        legend={t('days')}
        error={errors['days']}
        choices={CALL_DAYS.map((day) => ({ value: day, label: t(`dayNames.${day}`) }))}
      />
      <ChoiceGroup
        name="hours"
        legend={t('hours')}
        error={errors['hours']}
        choices={HOUR_KEYS.map((key) => ({
          value: key,
          label: t(`hourNames.${key}`),
          detail: CALL_HOURS[key],
        }))}
      />
    </div>
  );
}
