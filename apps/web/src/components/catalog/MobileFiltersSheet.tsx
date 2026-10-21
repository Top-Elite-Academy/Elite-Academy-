'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CloseIcon, FiltersIcon } from '@/components/ui/icons';
import type { CatalogFilters } from '@/lib/catalog/catalog-filters';
import { CatalogFilterPanel } from './CatalogFilterPanel';

/**
 * Phones (spec §3.2): filters open in a bottom sheet. Changes are a draft until
 * "Apply"; closing without applying keeps the previous filters. Native <dialog>
 * traps focus and closes with Escape.
 */
export function MobileFiltersSheet({
  filters,
  activeCount,
  onApply,
}: {
  filters: CatalogFilters;
  activeCount: number;
  onApply: (filters: CatalogFilters) => void;
}) {
  const t = useTranslations('Catalog');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(filters);

  const open = () => {
    setDraft(filters);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <Button
        variant="secondary"
        onClick={open}
        aria-haspopup="dialog"
        className="w-full lg:hidden"
      >
        <FiltersIcon className="size-4" />
        {activeCount > 0 ? t('filtersWithCount', { count: activeCount }) : t('filters')}
      </Button>

      <dialog
        ref={dialogRef}
        aria-label={t('filters')}
        className="mx-0 mt-auto mb-0 max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-white p-0 backdrop:bg-maroon-900/40"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold text-ink">{t('filters')}</h2>
          <button
            type="button"
            onClick={close}
            className="inline-flex size-11 items-center justify-center rounded-[var(--radius-control)] hover:bg-sand"
          >
            <CloseIcon />
            <span className="sr-only">{t('closeFilters')}</span>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">
          <CatalogFilterPanel filters={draft} onChange={setDraft} />
        </div>
        <div className="flex gap-3 border-t border-border px-5 py-4">
          <Button
            variant="ghost"
            onClick={() => {
              setDraft({ ...draft, subjects: [], levels: [] });
            }}
          >
            {t('clearAll')}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply(draft);
              close();
            }}
          >
            {t('apply')}
          </Button>
        </div>
      </dialog>
    </>
  );
}
