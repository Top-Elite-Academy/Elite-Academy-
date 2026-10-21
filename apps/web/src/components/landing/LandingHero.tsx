import { useTranslations } from 'next-intl';
import { Crest } from '@/components/brand/Crest';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PhoneIcon } from '@/components/ui/icons';
import { ROUTES } from '@/config/navigation';

/** Spec §3.1.1 — hero with the two main actions and the crest. */
export function LandingHero() {
  const t = useTranslations('Landing.hero');
  const tBrand = useTranslations('Brand');

  return (
    <section aria-labelledby="hero-title" className="on-dark bg-maroon-900 bg-dots text-white">
      <Container className="grid items-center gap-12 py-16 lg:grid-cols-[1.3fr_1fr] lg:py-24">
        <div>
          <p className="font-mono text-sm text-gold-300">{t('eyebrow')}</p>
          <h1
            id="hero-title"
            className="mt-5 font-display text-4xl font-semibold leading-[1.15] text-ivory sm:text-5xl lg:text-[3.4rem]"
          >
            {t('title')}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">{t('body')}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={ROUTES.courses} variant="gold" size="lg">
              {t('exploreCourses')}
            </ButtonLink>
            <ButtonLink href={ROUTES.mentoring} variant="outlineLight" size="lg">
              {t('bookMentoring')}
            </ButtonLink>
          </div>

          <p className="mt-6 flex items-center gap-2 text-sm text-white/80">
            <PhoneIcon className="size-4" />
            {t('note')}
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <Crest size={260} priority alt={tBrand('crestAlt')} className="size-56 sm:size-64" />
          <span className="h-px w-40 bg-gold-500/60" aria-hidden="true" />
          <p className="font-serif text-2xl italic text-gold-300" lang="la">
            {tBrand('motto')}
          </p>
        </div>
      </Container>
    </section>
  );
}
