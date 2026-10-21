import type { Locale, MentorKind } from '@eta/shared';
import type { Metadata } from 'next';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { MentoringBrowser } from '@/components/mentoring/MentoringBrowser';
import { PolicyNote } from '@/components/mentoring/PolicyNote';
import { ServiceCards } from '@/components/mentoring/ServiceCards';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { ROUTES } from '@/config/navigation';
import { getMentors, getPackages } from '@/lib/api/content';
import { formatShekels } from '@/lib/format/use-money';
import { pageAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Mentoring');
  return {
    title: t('metaTitle'),
    description: t('intro'),
    alternates: pageAlternates('/mentoring', (await getLocale()) as Locale),
  };
}

/** ?tab=career selects career advice; anything else is teacher mentoring (spec §2, §3.5). */
const kindOf = (tab: string | string[] | undefined): MentorKind =>
  tab === 'career' ? 'career' : 'instructor';

export default async function MentoringPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const kind = kindOf((await searchParams)['tab']);
  const [packages, mentors, format] = await Promise.all([
    getPackages(locale),
    getMentors(kind, locale),
    getFormatter(),
  ]);

  // "From" price per service: the cheapest single session of that kind.
  const priceOf = (serviceKind: MentorKind) => {
    const single = packages.find((pkg) => pkg.kind === serviceKind && pkg.sessions === 1);
    return single ? formatShekels(format, single.priceAgorot) : null;
  };

  return (
    <Container className="py-10 lg:py-14">
      <Breadcrumbs
        items={[
          { label: t('Breadcrumbs.home'), href: ROUTES.home },
          { label: t('Mentoring.crumb') },
        ]}
      />
      <h1 className="mt-6 font-display text-4xl font-semibold text-ink">{t('Mentoring.title')}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t('Mentoring.intro')}</p>

      <div className="mt-8 space-y-10">
        <ServiceCards
          selected={kind}
          mentoringPrice={priceOf('instructor')}
          careerPrice={priceOf('career')}
        />
        {/* key: switching service starts with fresh package and filter choices. */}
        <MentoringBrowser key={kind} kind={kind} packages={packages} mentors={mentors} />
        <PolicyNote />
      </div>
    </Container>
  );
}
