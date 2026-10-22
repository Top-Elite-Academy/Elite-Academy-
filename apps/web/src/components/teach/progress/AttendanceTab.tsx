'use client';

import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  type CohortAttendance,
  type SaveAttendanceInput,
} from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { RadioCard } from '@/components/booking/RadioCard';
import { FormAlert } from '@/components/forms/FormAlert';
import { Button } from '@/components/ui/Button';
import { usePathname, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

/** Attendance tab (design "Instructor 2"): choose a class, mark each student, save. */
export function AttendanceTab({
  cohortId,
  attendance,
}: {
  cohortId: string;
  attendance: CohortAttendance;
}) {
  const t = useTranslations('TeachProgress.attendance');
  const tErrors = useTranslations('errors');
  const dates = useCohortFormat();
  const router = useRouter();
  const pathname = usePathname();
  const dayId = useId();
  const [marks, setMarks] = useState<Record<string, AttendanceStatus | null>>(() =>
    Object.fromEntries(attendance.students.map((student) => [student.userId, student.status])),
  );
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!attendance.date) return <p className="text-ink-muted">{t('noClasses')}</p>;
  if (attendance.students.length === 0) return <p className="text-ink-muted">{t('noStudents')}</p>;

  const date = attendance.date;
  const save = async () => {
    setSaving(true);
    setStatus(null);
    const body: SaveAttendanceInput = {
      date,
      marks: Object.entries(marks).flatMap(([userId, value]) =>
        value ? [{ userId, status: value }] : [],
      ),
    };
    try {
      await apiRequest('PUT', `/api/teach/cohorts/${cohortId}/attendance`, body);
      setStatus({ tone: 'success', text: t('saved') });
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={dayId} className="text-sm font-semibold text-ink">
            {t('classLabel')}
          </label>
          <select
            id={dayId}
            value={date}
            onChange={(event) => {
              router.push(`${pathname}?tab=attendance&date=${event.target.value}`);
            }}
            className="min-h-11 rounded-[var(--radius-control)] border border-ink/25 bg-white px-3"
          >
            {attendance.classes.map((day) => (
              <option key={day} value={day}>
                {dates.longDate(day)}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setStatus(null);
            setMarks(Object.fromEntries(attendance.students.map((s) => [s.userId, 'present'])));
          }}
        >
          {t('markAll')}
        </Button>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {attendance.students.map((student) => {
          const name = `${student.firstName} ${student.lastName}`;
          return (
            <li
              key={student.userId}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-semibold text-ink">{name}</span>
              <fieldset>
                <legend className="sr-only">{t('studentGroup', { name })}</legend>
                <div className="flex gap-2">
                  {ATTENDANCE_STATUSES.map((value) => (
                    <RadioCard
                      key={value}
                      name={`attendance-${student.userId}`}
                      value={value}
                      checked={marks[student.userId] === value}
                      onSelect={() => {
                        setStatus(null);
                        setMarks((previous) => ({ ...previous, [student.userId]: value }));
                      }}
                      className="rounded-full px-4 py-1.5 text-sm font-semibold text-ink"
                    >
                      {t(value)}
                    </RadioCard>
                  ))}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ul>

      {status && <FormAlert tone={status.tone}>{status.text}</FormAlert>}
      <div className="sm:max-w-56">
        <Button size="lg" className="w-full" disabled={saving} onClick={() => void save()}>
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
