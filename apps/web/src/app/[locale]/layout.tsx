import { directionOf } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AccessibilityMenu } from '@/components/a11y/AccessibilityMenu';
import { routing } from '@/i18n/routing';
import { prefsAttributes } from '@/lib/a11y/preferences';
import { getA11yPrefs } from '@/lib/a11y/server-prefs';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    // Turns the relative canonical/hreflang URLs of each page into absolute ones.
    metadataBase: new URL(process.env['WEB_ORIGIN'] ?? 'http://localhost:3000'),
    title: { default: t('siteName'), template: `%s · ${t('siteName')}` },
    description: t('description'),
  };
}

/** Root layout per language: sets lang and dir (rtl for Arabic and Hebrew). */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={fontVariables}
      {...prefsAttributes(await getA11yPrefs())}
    >
      <body className="flex min-h-dvh flex-col bg-cream text-ink antialiased">
        <NextIntlClientProvider>
          {children}
          <AccessibilityMenu />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
