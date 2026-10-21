import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Crest } from './Crest';

/** Crest + "ELITE TECH / ACADEMY" wordmark; always links to the landing page (spec §2). */
export function Logo({ onDark = false, size = 'md' }: { onDark?: boolean; size?: 'md' | 'lg' }) {
  const t = useTranslations('Brand');
  const large = size === 'lg';
  return (
    <Link
      href="/"
      aria-label={t('homeLink')}
      className="inline-flex items-center gap-3 rounded-sm"
      dir="ltr"
    >
      <Crest size={large ? 52 : 40} className={onDark ? 'ring-1 ring-gold-500/70' : undefined} />
      <span className="flex flex-col leading-none" aria-hidden="true">
        <span
          className={cn(
            'whitespace-nowrap font-display font-semibold tracking-wide',
            large ? 'text-3xl' : 'text-xl',
            onDark ? 'text-white' : 'text-crimson-700',
          )}
        >
          {t('wordmarkTop')}
        </span>
        <span
          className={cn(
            'mt-1 whitespace-nowrap font-display tracking-[0.35em]',
            large ? 'text-xs' : 'text-[0.6rem]',
            onDark ? 'text-gold-300' : 'text-ink',
          )}
        >
          {t('wordmarkBottom')}
        </span>
      </span>
    </Link>
  );
}
