import type { Locale } from '@eta/shared';
import type { Metadata } from 'next';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { ROUTES } from '@/config/navigation';
import { ACCESSIBILITY_CONTACT } from '@/config/site';
import { pageAlternates } from '@/lib/seo';

const DONE = [
  'keyboard',
  'screenReader',
  'skip',
  'contrast',
  'languages',
  'errors',
  'zoom',
  'motion',
  'testing',
] as const;
const LIMITS = ['captcha', 'payment', 'videos'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AccessibilityStatement');
  return {
    title: t('metaTitle'),
    description: t('intro'),
    alternates: pageAlternates('/accessibility', (await getLocale()) as Locale),
  };
}

/** Accessibility statement required by Israeli law (IS 5568), linked from the footer and the menu. */
export default async function AccessibilityStatementPage() {
  const t = await getTranslations('AccessibilityStatement');
  const tCrumbs = await getTranslations('Breadcrumbs');
  const format = await getFormatter();
  const contact = ACCESSIBILITY_CONTACT;
  const updated = format.dateTime(new Date(`${contact.statementUpdated}T00:00:00Z`), {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  });

  return (
    <Container className="py-10 lg:py-14">
      <Breadcrumbs items={[{ label: tCrumbs('home'), href: ROUTES.home }, { label: t('title') }]} />
      <article className="mt-6 max-w-3xl">
        <h1 className="font-display text-4xl font-semibold text-ink">{t('title')}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink">{t('intro')}</p>

        <Section title={t('standardTitle')}>
          <p>{t('standard')}</p>
        </Section>
        <Section title={t('doneTitle')}>
          <List items={DONE.map((key) => t(`done.${key}`))} />
        </Section>
        <Section title={t('menuTitle')}>
          <p>{t('menu')}</p>
        </Section>
        <Section title={t('limitsTitle')}>
          <List items={LIMITS.map((key) => t(`limits.${key}`))} />
          <p className="mt-3">{t('limitsNote')}</p>
        </Section>
        <Section title={t('contactTitle')}>
          <p>{t('contact', { days: contact.replyDays })}</p>
          <dl className="mt-4 grid gap-3 rounded-[var(--radius-card)] border border-border bg-white p-5 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-ink-muted">{t('contactName')}</dt>
              <dd className="font-semibold">{contact.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">{t('contactEmail')}</dt>
              <dd>
                <a
                  href={`mailto:${contact.email}`}
                  className="font-semibold text-crimson-700 underline"
                >
                  {contact.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">{t('contactPhone')}</dt>
              <dd>
                <a
                  href={`tel:${contact.phoneE164}`}
                  dir="ltr"
                  className="font-semibold text-crimson-700 underline"
                >
                  {contact.phoneDisplay}
                </a>
              </dd>
            </div>
          </dl>
        </Section>
        <p className="mt-10 text-sm text-ink-muted">{t('updated', { date: updated })}</p>
      </article>
    </Container>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 ps-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
