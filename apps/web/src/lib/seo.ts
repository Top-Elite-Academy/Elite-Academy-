import { type Locale, LOCALES } from '@eta/shared';
import type { Metadata } from 'next';

/** "/" + locale + path, without a trailing slash for the home page. */
const localizedPath = (locale: Locale, path: string) => `/${locale}${path === '/' ? '' : path}`;

/**
 * Canonical URL and hreflang alternates for a page (spec §10 SEO: one URL per
 * language). `path` is locale-free, e.g. "/courses". Resolved against metadataBase.
 */
export function pageAlternates(path: string, locale: Locale): Metadata['alternates'] {
  return {
    canonical: localizedPath(locale, path),
    languages: Object.fromEntries(LOCALES.map((code) => [code, localizedPath(code, path)])),
  };
}
