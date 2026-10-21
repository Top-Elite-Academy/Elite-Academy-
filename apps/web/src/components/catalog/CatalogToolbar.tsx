'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { ChevronDownIcon, SearchIcon } from '@/components/ui/icons';
import { CATALOG_SORTS, type CatalogFilters } from '@/lib/catalog/catalog-filters';

const FIELD =
  'min-h-11 w-full rounded-[var(--radius-control)] border border-ink/25 bg-white text-base text-ink';

/** Search box and sort menu above the results. */
export function CatalogToolbar({
  filters,
  onChange,
}: {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
}) {
  const t = useTranslations('Catalog');
  const searchId = useId();
  const sortId = useId();

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
      <div>
        <label htmlFor={searchId} className="text-sm font-semibold text-ink">
          {t('search')}
        </label>
        <div className="relative mt-2">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id={searchId}
            type="search"
            value={filters.query}
            maxLength={100}
            placeholder={t('searchPlaceholder')}
            onChange={(event) => {
              onChange({ ...filters, query: event.target.value });
            }}
            className={`${FIELD} ps-9 pe-3`}
          />
        </div>
      </div>

      <div>
        <label htmlFor={sortId} className="text-sm font-semibold text-ink">
          {t('sortBy')}
        </label>
        <div className="relative mt-2">
          <select
            id={sortId}
            value={filters.sort}
            onChange={(event) => {
              const sort = CATALOG_SORTS.find((value) => value === event.target.value) ?? 'soonest';
              onChange({ ...filters, sort });
            }}
            className={`${FIELD} appearance-none ps-3 pe-9`}
          >
            {CATALOG_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {t(`sort.${sort}`)}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        </div>
      </div>
    </div>
  );
}
