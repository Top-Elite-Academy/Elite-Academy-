'use client';

import {
  BREAK_CHOICES,
  type MentorAvailability,
  NOTICE_CHOICES,
  type UpdateAvailabilityInput,
} from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';
import {
  bookedCells,
  cellKey,
  cellsToWindows,
  classCells,
  GRID_HOURS,
  windowsToCells,
} from '@/lib/availability/grid';
import { cn } from '@/lib/cn';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const asTime = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** "My weekly availability" (design "Instructor 5"): click hours open or closed, then save. */
export function AvailabilityEditor({ availability }: { availability: MentorAvailability }) {
  const t = useTranslations('TeachSessions');
  const tDay = useTranslations('DaysShort');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [open, setOpen] = useState(() => windowsToCells(availability.windows));
  const [breakMinutes, setBreakMinutes] = useState(availability.breakMinutes);
  const [minNoticeHours, setMinNoticeHours] = useState(availability.minNoticeHours);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const breakId = useId();
  const noticeId = useId();

  const locked = classCells(availability.liveClasses);
  const booked = bookedCells(availability.booked);

  const toggle = (key: string) => {
    setStatus(null);
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    // Class hours can never be open for bookings.
    const cells = new Set([...open].filter((key) => !locked.has(key)));
    const body: UpdateAvailabilityInput = {
      windows: cellsToWindows(cells),
      breakMinutes: breakMinutes as UpdateAvailabilityInput['breakMinutes'],
      minNoticeHours: minNoticeHours as UpdateAvailabilityInput['minNoticeHours'],
    };
    try {
      await apiRequest('PUT', '/api/teach/availability', body);
      setStatus({ tone: 'success', text: t('settings.saved') });
      router.refresh();
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'generic';
      setStatus({
        tone: 'error',
        text: tErrors.has(code) ? tErrors(code as 'generic') : tErrors('generic'),
      });
    } finally {
      setSaving(false);
    }
  };

  const openCount = [...open].filter((key) => !locked.has(key)).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <div>
        <ul
          aria-label={t('grid.legendLabel')}
          className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted"
        >
          <Legend className="border-sage-700/40 bg-sage-100">{t('grid.open')}</Legend>
          <Legend className="border-slate-700/40 bg-slate-100">{t('grid.booked')}</Legend>
          <Legend className="border-crimson-700/40 bg-crimson-50">{t('grid.liveClass')}</Legend>
          <Legend className="border-border bg-white">{t('grid.closed')}</Legend>
        </ul>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] table-fixed border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th scope="col" className="w-14 text-start font-medium text-ink-muted">
                  <span className="sr-only">{t('grid.hour')}</span>
                </th>
                {DAYS.map((day) => (
                  <th key={day} scope="col" className="font-semibold text-ink">
                    {tDay(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRID_HOURS.map((hour) => (
                <tr key={hour}>
                  <th scope="row" className="pe-2 text-start font-mono font-medium text-ink-muted">
                    <span dir="ltr">{asTime(hour)}</span>
                  </th>
                  {DAYS.map((day, weekday) => {
                    const key = cellKey(weekday, hour);
                    const label = (state: string) =>
                      t('grid.cell', { day: tDay(day), time: asTime(hour), state });
                    if (locked.has(key))
                      return (
                        <td key={key}>
                          <span className="flex h-8 items-center justify-center rounded border border-crimson-700/40 bg-crimson-50 text-crimson-700">
                            <span aria-hidden="true">{t('grid.cellClass')}</span>
                            <span className="sr-only">{label(t('grid.liveClass'))}</span>
                          </span>
                        </td>
                      );
                    const student = booked.get(key);
                    if (student)
                      return (
                        <td key={key}>
                          <span className="flex h-8 items-center justify-center truncate rounded border border-slate-700/40 bg-slate-100 px-1 text-slate-700">
                            <span aria-hidden="true">{student}</span>
                            <span className="sr-only">
                              {label(`${t('grid.booked')} · ${student}`)}
                            </span>
                          </span>
                        </td>
                      );
                    const isOpen = open.has(key);
                    return (
                      <td key={key}>
                        <button
                          type="button"
                          aria-pressed={isOpen}
                          aria-label={label(isOpen ? t('grid.open') : t('grid.closed'))}
                          onClick={() => {
                            toggle(key);
                          }}
                          className={cn(
                            'flex h-8 w-full items-center justify-center rounded border',
                            isOpen
                              ? 'border-sage-700/40 bg-sage-100 font-semibold text-sage-700'
                              : 'border-dashed border-ink/20 bg-white hover:bg-sand',
                          )}
                        >
                          {isOpen ? t('grid.cellOpen') : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{t('settings.sessionLength')}</p>
          <p className="text-sm text-ink-muted">
            {t('settings.sessionLengthValue', { minutes: availability.sessionMinutes })}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={breakId} className="text-sm font-semibold text-ink">
            {t('settings.break')}
          </label>
          <select
            id={breakId}
            value={breakMinutes}
            onChange={(event) => {
              setBreakMinutes(Number(event.target.value));
            }}
            className="min-h-11 rounded-[var(--radius-control)] border border-ink/25 bg-white px-3"
          >
            {BREAK_CHOICES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {t('settings.breakValue', { minutes })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={noticeId} className="text-sm font-semibold text-ink">
            {t('settings.notice')}
          </label>
          <select
            id={noticeId}
            value={minNoticeHours}
            onChange={(event) => {
              setMinNoticeHours(Number(event.target.value));
            }}
            className="min-h-11 rounded-[var(--radius-control)] border border-ink/25 bg-white px-3"
          >
            {NOTICE_CHOICES.map((hours) => (
              <option key={hours} value={hours}>
                {t('settings.noticeValue', { hours })}
              </option>
            ))}
          </select>
        </div>
        <p className="rounded-[var(--radius-control)] bg-sand/70 px-3 py-2 text-sm font-semibold text-ink">
          {t('settings.hoursOpen', { count: openCount })}
        </p>
        {status && <FormAlert tone={status.tone}>{status.text}</FormAlert>}
        <Button size="lg" disabled={saving} onClick={() => void save()}>
          {t('settings.save')}
        </Button>
      </div>
    </div>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden="true" className={cn('size-3 rounded-sm border', className)} />
      {children}
    </li>
  );
}
