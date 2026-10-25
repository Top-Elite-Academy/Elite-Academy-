import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { locale as rootLocale } from 'next/root-params';
import { routing } from './routing';

/**
 * Picks the language for each request from the /[locale] segment (or an explicit override).
 * "now" is fixed per request so relative times ("2 minutes ago") are the same on the
 * server and in the browser while the page hydrates.
 */
export default getRequestConfig(async ({ locale: explicit }) => {
  const requested = explicit ?? (await rootLocale());
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = (await import(`../../messages/${locale}.json`)) as { default: Messages };
  return { locale, messages: messages.default, now: new Date() };
});

type Messages = Record<string, unknown>;
