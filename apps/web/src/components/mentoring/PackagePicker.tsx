'use client';

import type { PackageInfo } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { cn } from '@/lib/cn';
import { useMoney } from '@/lib/format/use-money';

/** Note under each package, by number of sessions (translation keys). */
const NOTES: Record<number, 'single' | 'four' | 'eight' | 'twelve'> = {
  1: 'single',
  4: 'four',
  8: 'eight',
  12: 'twelve',
};

/**
 * Mentoring packages as radio cards (spec §3.5). The chosen package goes into
 * each mentor's booking link; the 8-session plan is recommended and preselected.
 */
export function PackagePicker({
  packages,
  sessionMinutes,
  selected,
  onSelect,
}: {
  packages: PackageInfo[];
  sessionMinutes: number;
  selected: string;
  onSelect: (code: string) => void;
}) {
  const t = useTranslations('Mentoring.packages');
  const money = useMoney();
  const headingId = useId();

  const nameOf = (pkg: PackageInfo) =>
    pkg.sessions === 1
      ? t('single')
      : pkg.recommended
        ? t('plan', { count: pkg.sessions })
        : t('sessions', { count: pkg.sessions });

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-xl font-semibold text-ink">
        {t('title')}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={headingId}
        className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {packages.map((pkg) => {
          const isSelected = pkg.code === selected;
          const note = NOTES[pkg.sessions];
          return (
            <label
              key={pkg.code}
              className={cn(
                'relative flex cursor-pointer flex-col rounded-[var(--radius-card)] border bg-white p-4 transition-shadow hover:shadow-md',
                isSelected ? 'border-2 border-slate-700 shadow-md' : 'border-border',
                'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-crimson-700',
              )}
            >
              <input
                type="radio"
                name="package"
                value={pkg.code}
                checked={isSelected}
                onChange={() => {
                  onSelect(pkg.code);
                }}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{nameOf(pkg)}</span>
                {pkg.recommended && (
                  <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-semibold text-gold-700">
                    {t('recommended')}
                  </span>
                )}
              </span>
              <span className="mt-1 text-xs text-ink-muted">
                {t('detail', { count: pkg.sessions, minutes: sessionMinutes })}
              </span>
              <span className="mt-3 text-2xl font-bold text-ink">{money(pkg.priceAgorot)}</span>
              {pkg.sessions > 1 && (
                <span className="mt-1 text-xs text-ink-muted">
                  {t('perSession', { price: money(Math.round(pkg.priceAgorot / pkg.sessions)) })}
                </span>
              )}
              {note && <span className="mt-1 text-xs text-ink-muted">{t(`notes.${note}`)}</span>}
            </label>
          );
        })}
      </div>
    </section>
  );
}
