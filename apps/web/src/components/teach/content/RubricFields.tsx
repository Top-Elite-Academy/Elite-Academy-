'use client';

import { type AssignmentView, RUBRIC_MAX_CRITERIA, RUBRIC_TOTAL } from '@eta/shared';
import { useTranslations } from 'next-intl';
import type { Dispatch, SetStateAction } from 'react';
import { CONTROL_CLASS } from '@/components/forms/FieldParts';
import { Button } from '@/components/ui/Button';
import { CloseIcon, PlusIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export interface RubricRow {
  /** Stable key for React; the server id when the row is saved. */
  key: string;
  id?: string;
  title: string;
  maxPoints: number;
}

let nextKey = 0;
const newRow = (maxPoints = 0): RubricRow => ({ key: `new-${nextKey++}`, title: '', maxPoints });

/** The saved rubric as editable rows (a new exercise starts with two criteria: 60 + 40). */
export const toRubricRows = (assignment: AssignmentView | null): RubricRow[] =>
  assignment ? assignment.rubric.map((row) => ({ ...row, key: row.id })) : [newRow(60), newRow(40)];

export const rubricTotal = (rows: RubricRow[]) =>
  rows.reduce((sum, row) => sum + (Number.isFinite(row.maxPoints) ? row.maxPoints : 0), 0);

/** Criteria with their maximum points; the total must reach 100. */
export function RubricFields({
  rows,
  setRows,
}: {
  rows: RubricRow[];
  setRows: Dispatch<SetStateAction<RubricRow[]>>;
}) {
  const t = useTranslations('TeachContent.exercise');
  const total = rubricTotal(rows);
  const update = (key: string, change: Partial<RubricRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-sm font-semibold text-ink">{t('rubric')}</legend>
      {rows.map((row, index) => (
        <div key={row.key} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm text-ink">
            {t('criterion', { number: index + 1 })}
            <input
              value={row.title}
              maxLength={120}
              onChange={(event) => {
                update(row.key, { title: event.target.value });
              }}
              className={CONTROL_CLASS}
            />
          </label>
          <label className="flex w-28 flex-col gap-1.5 text-sm text-ink">
            {t('points', { number: index + 1 })}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={RUBRIC_TOTAL}
              value={Number.isFinite(row.maxPoints) ? row.maxPoints : ''}
              onChange={(event) => {
                update(row.key, { maxPoints: event.target.valueAsNumber });
              }}
              className={CONTROL_CLASS}
            />
          </label>
          <Button
            variant="ghost"
            size="sm"
            disabled={rows.length === 1}
            aria-label={t('removeCriterion', { number: index + 1 })}
            onClick={() => {
              setRows((current) => current.filter((item) => item.key !== row.key));
            }}
          >
            <CloseIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={rows.length >= RUBRIC_MAX_CRITERIA}
          onClick={() => {
            setRows((current) => [...current, newRow()]);
          }}
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          {t('addCriterion')}
        </Button>
        <p
          aria-live="polite"
          className={cn(
            'text-sm font-semibold',
            total === RUBRIC_TOTAL ? 'text-sage-700' : 'text-crimson-700',
          )}
        >
          {t('total', { total, max: RUBRIC_TOTAL })}
        </p>
      </div>
    </fieldset>
  );
}
