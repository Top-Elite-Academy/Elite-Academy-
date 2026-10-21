import type { Locale } from '@eta/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { ROUTES } from '@/config/navigation';
import { getPrograms } from '@/lib/api/content';
import { parseCatalogFilters } from '@/lib/catalog/catalog-filters';
import { pageAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Catalog');
  const locale = (await getLocale()) as Locale;
  return {
    title: t('title'),
    description: t('intro'),
    alternates: pageAlternates(ROUTES.courses, locale),
  };
}

/** Course catalog (spec §3.2). The first render is already filtered from the URL. */
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const [programs, params] = await Promise.all([getPrograms(locale), searchParams]);

  return (
    <Container className="py-10 lg:py-14">
      <Breadcrumbs
        items={[{ label: t('Breadcrumbs.home'), href: ROUTES.home }, { label: t('Nav.courses') }]}
      />
      <h1 className="mt-6 font-display text-4xl font-semibold text-ink">{t('Catalog.title')}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t('Catalog.intro')}</p>
      <CatalogBrowser programs={programs} initialFilters={parseCatalogFilters(params)} />
    </Container>
  );
}
