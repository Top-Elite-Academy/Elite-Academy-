import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { ROUTES } from '@/config/navigation';

/** Spec §3.1.8 — "Not sure where to start?" → booking flow with career advice preselected. */
export function ClosingCtaSection() {
  const t = useTranslations('Landing.closing');

  return (
    <section aria-labelledby="closing-title" className="bg-cream py-16">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[var(--radius-card)] bg-crimson-100 px-8 py-10 sm:px-12">
          <div className="max-w-xl">
            <h2 id="closing-title" className="font-display text-3xl font-semibold text-ink">
              {t('title')}
            </h2>
            <p className="mt-3 leading-relaxed text-ink">{t('body')}</p>
          </div>
          <ButtonLink href={ROUTES.bookCareerAdvice} size="lg">
            {t('cta')}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
