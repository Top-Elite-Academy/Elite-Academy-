'use client';

import type { CohortStudent, EnrollmentStatus } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { MentorAvatar } from '@/components/mentoring/MentorAvatar';
import { Badge } from '@/components/ui/Badge';
import { SearchIcon } from '@/components/ui/icons';
import { useCohortFormat } from '@/lib/format/use-cohort-format';
import { cn } from '@/lib/cn';

type Filter = 'all' | Exclude<EnrollmentStatus, 'withdrawn'>;
const FILTERS: Filter[] = ['all', 'confirmed', 'pending'];

/** Students of a cohort with status filters and search (design "Instructor 2"). */
export function CohortStudents({ students }: { students: CohortStudent[] }) {
  const t = useTranslations('Teach.cohort');
  const dates = useCohortFormat();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const searchId = useId();

  const count = (value: Filter) =>
    value === 'all' ? students.length : students.filter((s) => s.status === value).length;
  const needle = query.trim().toLocaleLowerCase();
  const visible = students.filter(
    (student) =>
      (filter === 'all' || student.status === filter) &&
      `${student.firstName} ${student.lastName}`.toLocaleLowerCase().includes(needle),
  );

  if (students.length === 0) return <p className="text-ink-muted">{t('noStudents')}</p>;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label={t('filtersLabel')} className="flex flex-wrap gap-2">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
              }}
              className={cn(
                'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold',
                filter === value
                  ? 'border-ink bg-ink text-white'
                  : 'border-ink/25 bg-white text-ink hover:border-ink/50',
              )}
            >
              {t(`filters.${value}`)}
              <span className={filter === value ? 'text-white/80' : 'text-ink-muted'}>
                {count(value)}
              </span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <label htmlFor={searchId} className="sr-only">
            {t('search')}
          </label>
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id={searchId}
            type="search"
            value={query}
            placeholder={t('search')}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            className="min-h-11 w-full rounded-[var(--radius-control)] border border-ink/25 bg-white ps-9 pe-3 text-sm"
          />
        </div>
      </div>

      {count('pending') > 0 && <p className="mt-3 text-sm text-ink-muted">{t('pendingNote')}</p>}

      {visible.length === 0 ? (
        <p role="status" className="mt-6 text-ink-muted">
          {t('noMatch')}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-border text-ink-muted">
                <th scope="col" className="py-2 pe-4 text-start font-medium">
                  {t('student')}
                </th>
                <th scope="col" className="py-2 pe-4 text-start font-medium">
                  {t('status')}
                </th>
                <th scope="col" className="hidden py-2 pe-4 text-start font-medium sm:table-cell">
                  {t('requested')}
                </th>
                <th scope="col" className="hidden py-2 text-start font-medium sm:table-cell">
                  {t('confirmedOn')}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((student) => {
                const name = `${student.firstName} ${student.lastName}`;
                return (
                  <tr key={student.enrollmentId} className="border-b border-border last:border-b-0">
                    <th scope="row" className="py-3 pe-4 text-start font-semibold text-ink">
                      <span className="flex items-center gap-3">
                        <MentorAvatar name={name} photoPath={null} size="sm" />
                        {name}
                      </span>
                    </th>
                    <td className="py-3 pe-4">
                      <Badge tone={student.status === 'confirmed' ? 'sage' : 'gold'}>
                        {t(`statuses.${student.status}`)}
                      </Badge>
                    </td>
                    <td className="hidden py-3 pe-4 text-ink-muted sm:table-cell">
                      {dates.dayMonth(student.requestedAt.slice(0, 10))}
                    </td>
                    <td className="hidden py-3 text-ink-muted sm:table-cell">
                      {student.confirmedAt ? dates.dayMonth(student.confirmedAt.slice(0, 10)) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
