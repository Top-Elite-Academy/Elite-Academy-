import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Crest } from './Crest';

/** Crest + academy name; always links to the landing page (spec §2). */
export function Logo({ onDark = false }: { onDark?: boolean }) {
  const t = useTranslations('Brand');
  return (
    <Link href="/" aria-label={t('homeLink')} className="inline-flex items-center gap-3 rounded-sm">
      <Crest />
      <span
        className={cn('text-lg font-bold leading-tight', onDark ? 'text-white' : 'text-navy-900')}
      >
        {t('name')}
      </span>
    </Link>
  );
}
