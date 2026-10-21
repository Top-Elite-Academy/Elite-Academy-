import { useTranslations } from 'next-intl';
import { Crest } from '@/components/brand/Crest';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { ArrowForwardIcon } from '@/components/ui/icons';
import { ROUTES } from '@/config/navigation';

/** Landing hero only — the full landing page is built in milestone 2 (spec §3.1). */
export default function HomePage() {
  const t = useTranslations();
  return (
    <section className="bg-navy-50">
      <Container className="grid items-center gap-10 py-16 lg:grid-cols-[1fr_auto] lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-crimson-700">{t('Home.eyebrow')}</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-navy-900 sm:text-5xl">
            {t('Home.title')}
          </h1>
          <p className="mt-4 text-lg text-ink-muted">{t('Home.body')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={ROUTES.courses} size="lg">
              {t('Home.exploreCourses')}
              <ArrowForwardIcon />
            </ButtonLink>
            <ButtonLink href={ROUTES.mentoring} size="lg" variant="secondary">
              {t('Home.bookMentoring')}
            </ButtonLink>
          </div>
        </div>
        <div className="hidden flex-col items-center gap-3 lg:flex">
          <Crest className="h-48" />
          <p className="text-sm italic text-navy-700" lang="la">
            {t('Brand.motto')}
          </p>
        </div>
      </Container>
    </section>
  );
}
