'use client';

import type { ProgramSummary } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { ProgramCard } from './ProgramCard';

/** Result count (announced to screen readers), the cards, or the empty state. */
export function CatalogResults({
  programs,
  onClearFilters,
}: {
  programs: ProgramSummary[];
  onClearFilters: () => void;
}) {
  const t = useTranslations('Catalog');

  return (
    <div>
      <p aria-live="polite" className="text-sm text-ink-muted">
        {t('resultCount', { count: programs.length })}
      </p>

      {programs.length === 0 ? (
        <div className="mt-4 rounded-[var(--radius-card)] border border-dashed border-ink/25 bg-white px-6 py-12 text-center">
          <p className="font-semibold text-ink">{t('emptyTitle')}</p>
          <p className="mt-1 text-sm text-ink-muted">{t('emptyBody')}</p>
          <Button variant="secondary" className="mt-5" onClick={onClearFilters}>
            {t('clearFilters')}
          </Button>
        </div>
      ) : (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => (
            <li key={program.slug} className="flex">
              <ProgramCard program={program} variant="catalog" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
