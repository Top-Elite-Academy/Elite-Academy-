import { DEFAULT_LOCALE, LOCALES } from '@eta/shared';
import { defineRouting } from 'next-intl/routing';

/** One URL per language: /en/..., /ar/..., /he/... (spec §10 SEO). */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});
