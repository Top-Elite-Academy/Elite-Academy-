import { useTranslations } from 'next-intl';

export const MAIN_CONTENT_ID = 'main-content';

/** First focusable element on every page (WCAG 2.4.1 Bypass Blocks). Visible only when focused. */
export function SkipLink() {
  const t = useTranslations('A11y');
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-navy-900 focus:shadow-lg"
    >
      {t('skipToContent')}
    </a>
  );
}
