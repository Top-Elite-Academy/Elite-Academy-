'use client';

import { PROGRAM_LEVELS, PROGRAM_SUBJECTS } from '@eta/shared';
import { useTranslations } from 'next-intl';
import type { CatalogFilters } from '@/lib/catalog/catalog-filters';
import { FilterChips } from './FilterChips';

/** Subject and level chips. Controlled: the parent decides when changes apply. */
export function CatalogFilterPanel({
  filters,
  onChange,
}: {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
}) {
  const t = useTranslations('Catalog');
  const tSubject = useTranslations('Subjects');
  const tLevel = useTranslations('Levels');

  return (
    <div className="space-y-6">
      <FilterChips
        legend={t('subject')}
        allLabel={t('all')}
        options={PROGRAM_SUBJECTS}
        labelOf={(subject) => tSubject(subject)}
        selected={filters.subjects}
        onChange={(subjects) => {
          onChange({ ...filters, subjects });
        }}
      />
      <FilterChips
        legend={t('level')}
        allLabel={t('all')}
        options={PROGRAM_LEVELS}
        labelOf={(level) => tLevel(level)}
        selected={filters.levels}
        onChange={(levels) => {
          onChange({ ...filters, levels });
        }}
      />
    </div>
  );
}
