import { directionOf } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AccessibilityMenu } from '@/components/a11y/AccessibilityMenu';
import { routing } from '@/i18n/routing';
import { A11Y_BOOT_SCRIPT } from '@/lib/a11y/preferences';
import { getNonce } from '@/lib/nonce';
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
    // suppressHydrationWarning: the head script adds the visitor's accessibility settings first.
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        {/* Our own constant script (no user data), allowed by the CSP nonce. */}
        {/* eslint-disable-next-line react/no-danger */}
        <script nonce={await getNonce()} dangerouslySetInnerHTML={{ __html: A11Y_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col bg-cream text-ink antialiased">
        <NextIntlClientProvider>
          {children}
          <AccessibilityMenu />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
