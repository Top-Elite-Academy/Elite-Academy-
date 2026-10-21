import { useTranslations } from 'next-intl';
import { ArrowForwardIcon, InfoIcon } from '@/components/ui/icons';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';

/** Side box "Book career advice" → Mentoring, career tab (spec §3.2). */
export function CareerAdviceBox() {
  const t = useTranslations('Catalog.careerBox');
  return (
    <Link
      href={ROUTES.careerAdvice}
      className="flex gap-3 rounded-[var(--radius-card)] border border-slate-700/30 bg-slate-100 p-4 text-sm text-slate-700 hover:border-slate-700/60"
    >
      <InfoIcon className="mt-0.5 size-4" />
      <span>
        <span className="block font-semibold text-ink">{t('title')}</span>
        <span className="mt-1 block text-ink">{t('body')}</span>
        <span className="mt-2 inline-flex items-center gap-1 font-semibold text-crimson-700">
          {t('cta')}
          <ArrowForwardIcon className="size-4" />
        </span>
      </span>
    </Link>
  );
}
