import { useLocale, useTranslations } from 'next-intl';
import { CONTROL_CLASS } from '@/components/forms/FieldParts';
import { SearchIcon } from '@/components/ui/icons';

/** Search names, subjects and messages (a plain GET form: works without JavaScript). */
export function SearchThreads({ base, filter, q }: { base: string; filter: string; q: string }) {
  const t = useTranslations('Messages');
  const locale = useLocale();
  return (
    <form role="search" action={`/${locale}${base}`} method="get" className="flex gap-2">
      {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
      <label htmlFor="message-search" className="sr-only">
        {t('search')}
      </label>
      <input
        id="message-search"
        name="q"
        type="search"
        defaultValue={q}
        maxLength={100}
        placeholder={t('searchPlaceholder')}
        className={CONTROL_CLASS}
      />
      <button
        type="submit"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-ink/25 bg-white hover:bg-cream"
      >
        <SearchIcon className="size-5" aria-hidden="true" />
        <span className="sr-only">{t('search')}</span>
      </button>
    </form>
  );
}
