'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { groupSlotsByDay, type SlotDay } from '@/lib/booking/slot-days';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { RadioCard } from './RadioCard';
import { useFreeSlots } from './use-free-slots';

/** Step 2 (spec §3.7): a day, then one of the mentor's free times that day. */
export function DateTimeStep({
  mentorId,
  service,
  startAt,
  onTime,
}: {
  mentorId: string;
  service: string;
  startAt: string | null;
  onTime: (startAt: string) => void;
}) {
  const t = useTranslations();
  const slots = useFreeSlots(mentorId, service);

  if (slots.status === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {t('Booking.datetime.loading')}
      </p>
    );
  }
  if (slots.status === 'error') {
    const key = `errors.${slots.code}`;
    return (
      <FormAlert tone="error">
        {t.has(key) ? t(key as 'errors.generic') : t('errors.generic')}
      </FormAlert>
    );
  }
  const days = groupSlotsByDay(slots.slots);
  if (days.length === 0) return <p className="text-ink">{t('Booking.datetime.none')}</p>;
  return <DayAndTime days={days} startAt={startAt} onTime={onTime} />;
}

function DayAndTime({
  days,
  startAt,
  onTime,
}: {
  days: SlotDay[];
  startAt: string | null;
  onTime: (startAt: string) => void;
}) {
  const t = useTranslations('Booking.datetime');
  const format = useBookingFormat();
  const chosenDay = days.find((day) => day.slots.some((slot) => slot.startAt === startAt));
  const [isoDate, setIsoDate] = useState((chosenDay ?? days[0])?.isoDate ?? '');
  const times = days.find((day) => day.isoDate === isoDate)?.slots ?? [];

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="font-semibold text-ink">{t('days')}</legend>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
          {days.map((day) => (
            <RadioCard
              key={day.isoDate}
              name="day"
              value={day.isoDate}
              checked={day.isoDate === isoDate}
              onSelect={setIsoDate}
              className="justify-center px-2 py-3 text-center text-sm font-semibold text-ink"
            >
              {format.shortDay(day.isoDate)}
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-semibold text-ink">{t('times')}</legend>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {times.map((slot) => (
            <RadioCard
              key={slot.startAt}
              name="time"
              value={slot.startAt}
              checked={slot.startAt === startAt}
              onSelect={onTime}
              className="justify-center px-2 py-3 text-sm font-semibold text-ink"
            >
              <span dir="ltr">{format.time(slot.startAt)}</span>
            </RadioCard>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
