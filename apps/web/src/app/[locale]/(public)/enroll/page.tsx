import type { Locale } from '@eta/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { EnrollForm } from '@/components/enroll/EnrollForm';
import { TalkNowBox } from '@/components/enroll/TalkNowBox';
import { WhatHappensNext } from '@/components/enroll/WhatHappensNext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { ROUTES } from '@/config/navigation';
import { getPrograms } from '@/lib/api/content';
import { getNonce } from '@/lib/nonce';
import { pageAlternates } from '@/lib/seo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Enroll');
  const locale = (await getLocale()) as Locale;
  return {
    title: t('metaTitle'),
    description: t('intro'),
    alternates: pageAlternates(ROUTES.enroll, locale),
  };
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Enroll — book a call (spec §3.6). `?program=` and `?cohort=` preselect from course pages. */
export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const [programs, params, nonce] = await Promise.all([
    getPrograms(locale),
    searchParams,
    getNonce(),
  ]);
  const requested = first(params['program']);
  const defaultProgram = programs.some((p) => p.slug === requested) ? requested : undefined;
  const cohort = first(params['cohort']);

  return (
    <Container className="py-10 lg:py-14">
      <Breadcrumbs
        items={[{ label: t('Nav.courses'), href: ROUTES.courses }, { label: t('Enroll.crumb') }]}
      />
      <h1 className="mt-6 font-display text-4xl font-semibold text-ink">{t('Enroll.title')}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t('Enroll.intro')}</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="rounded-[var(--radius-card)] border border-border border-t-2 border-t-crimson-700 bg-white p-6 shadow-sm sm:p-8">
          <EnrollForm
            programs={programs.map(({ slug, title }) => ({ slug, title }))}
            defaultProgram={defaultProgram}
            cohortId={cohort && UUID.test(cohort) ? cohort : undefined}
            nonce={nonce}
          />
        </div>
        <aside className="space-y-4">
          <WhatHappensNext />
          <TalkNowBox />
        </aside>
      </div>
    </Container>
  );
}
