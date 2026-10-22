'use client';

import type { CohortStudent } from '@eta/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { MentorAvatar } from '@/components/mentoring/MentorAvatar';
import { Badge } from '@/components/ui/Badge';
import { SearchIcon } from '@/components/ui/icons';
import { teachStudentPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { ProgressBadge } from './ProgressBadge';

type Filter = 'all' | 'on_track' | 'behind' | 'at_risk' | 'pending';
const FILTERS: Filter[] = ['all', 'on_track', 'behind', 'at_risk', 'pending'];

const matches = (student: CohortStudent, filter: Filter) =>
  filter === 'all' ||
  (filter === 'pending' ? student.status === 'pending' : student.progress === filter);

/** Students of a cohort with status filters and search (design "Instructor 2"). */
export function CohortStudents({
  cohortId,
  students,
}: {
  cohortId: string;
  students: CohortStudent[];
}) {
  const t = useTranslations('Teach.cohort');
  const tProgress = useTranslations('TeachProgress');
  const format = useFormatter();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const searchId = useId();

  const label = (value: Filter) =>
    value === 'all'
      ? t('filters.all')
      : value === 'pending'
        ? t('filters.pending')
        : tProgress(`statuses.${value}`);
  const needle = query.trim().toLocaleLowerCase();
  const visible = students.filter(
    (student) =>
      matches(student, filter) &&
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
              {label(value)}
              <span className={filter === value ? 'text-white/80' : 'text-ink-muted'}>
                {students.filter((student) => matches(student, value)).length}
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

      {students.some((student) => student.status === 'pending') && (
        <p className="mt-3 text-sm text-ink-muted">{t('pendingNote')}</p>
      )}

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
                  {tProgress('table.attendance')}
                </th>
                <th scope="col" className="hidden py-2 pe-4 text-start font-medium md:table-cell">
                  {tProgress('table.lastActive')}
                </th>
                <th scope="col" className="py-2 pe-4 text-start font-medium">
                  {tProgress('table.progress')}
                </th>
                <th scope="col" className="py-2 text-start font-medium">
                  <span className="sr-only">{tProgress('table.view')}</span>
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
                    <td className="py-3 pe-4 text-ink">
                      {student.attendance.rate === null ? '—' : `${student.attendance.rate}%`}
                    </td>
                    <td className="hidden py-3 pe-4 text-ink-muted md:table-cell">
                      {student.lastActiveAt
                        ? format.relativeTime(new Date(student.lastActiveAt))
                        : tProgress('never')}
                    </td>
                    <td className="py-3 pe-4">
                      {student.status === 'pending' ? (
                        <Badge tone="gold">{t('statuses.pending')}</Badge>
                      ) : (
                        <ProgressBadge progress={student.progress} />
                      )}
                    </td>
                    <td className="py-3">
                      <Link
                        href={teachStudentPath(cohortId, student.userId)}
                        className="rounded-sm font-semibold text-crimson-700 underline"
                      >
                        {tProgress('table.view')}
                        <span className="sr-only">{`: ${name}`}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-ink-muted">{tProgress('statusNote')}</p>
    </div>
  );
}
