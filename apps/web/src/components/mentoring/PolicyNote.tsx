import { useTranslations } from 'next-intl';
import { InfoIcon } from '@/components/ui/icons';

/**
 * Rescheduling and cancellation (spec §4.5: free up to 24 h before).
 * ⚠ The final rule is an open item (spec §12) — the wording lives in messages/*.json.
 */
export function PolicyNote() {
  const t = useTranslations('Mentoring.policy');
  return (
    <aside
      aria-labelledby="policy-title"
      className="flex gap-3 rounded-[var(--radius-card)] border border-slate-700/30 bg-slate-100 p-4 text-sm"
    >
      <InfoIcon className="mt-0.5 size-4 text-slate-700" />
      <div>
        <h2 id="policy-title" className="font-semibold text-ink">
          {t('title')}
        </h2>
        <p className="mt-1 text-ink">{t('body')}</p>
      </div>
    </aside>
  );
}
