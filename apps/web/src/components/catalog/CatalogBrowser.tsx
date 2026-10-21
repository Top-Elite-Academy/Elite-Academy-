'use client';

import type { Locale, ProgramSummary } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FiltersIcon } from '@/components/ui/icons';
import {
  activeFilterCount,
  applyCatalogFilters,
  type CatalogFilters,
  EMPTY_FILTERS,
  toQueryString,
} from '@/lib/catalog/catalog-filters';
import { CareerAdviceBox } from './CareerAdviceBox';
import { CatalogFilterPanel } from './CatalogFilterPanel';
import { CatalogResults } from './CatalogResults';
import { CatalogToolbar } from './CatalogToolbar';
import { MobileFiltersSheet } from './MobileFiltersSheet';

/**
 * Catalog (spec §3.2): filters update the list instantly and are written to the
 * URL so the filtered list can be shared. The URL is updated with the History
 * API, which Next.js keeps in sync, so typing does not reload the page.
 */
export function CatalogBrowser({
  programs,
  initialFilters,
}: {
  programs: ProgramSummary[];
  initialFilters: CatalogFilters;
}) {
  const t = useTranslations('Catalog');
  const locale = useLocale() as Locale;
  const [filters, setFilters] = useState(initialFilters);
  const results = useMemo(
    () => applyCatalogFilters(programs, filters, locale),
    [programs, filters, locale],
  );
  const activeCount = activeFilterCount(filters);
  const clearAll = () => {
    setFilters({ ...EMPTY_FILTERS, sort: filters.sort });
  };

  useEffect(() => {
    const query = toQueryString(filters);
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(window.history.state, '', url);
  }, [filters]);

  return (
    <div className="mt-8 space-y-8">
      <CatalogToolbar filters={filters} onChange={setFilters} />

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside aria-label={t('filters')} className="space-y-5">
          <MobileFiltersSheet filters={filters} activeCount={activeCount} onApply={setFilters} />
          <div className="hidden rounded-[var(--radius-card)] border border-border bg-white p-5 lg:block">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <FiltersIcon className="size-4" />
                {t('filters')}
              </h2>
              <Button size="sm" variant="ghost" className="bg-sand" onClick={clearAll}>
                {t('clearAll')}
              </Button>
            </div>
            <CatalogFilterPanel filters={filters} onChange={setFilters} />
          </div>
          <div className="hidden lg:block">
            <CareerAdviceBox />
          </div>
        </aside>

        <div>
          <CatalogResults programs={results} onClearFilters={clearAll} />
          <div className="mt-8 lg:hidden">
            <CareerAdviceBox />
          </div>
        </div>
      </div>
    </div>
  );
}
