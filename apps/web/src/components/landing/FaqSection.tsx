import type { FaqItem } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { FaqList } from '@/components/ui/FaqList';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';

/** Spec §3.1.7 (#faq): one question open at a time; "Message support" → contact. */
export function FaqSection({ faqs }: { faqs: FaqItem[] }) {
  const t = useTranslations('Landing.faq');
  if (faqs.length === 0) return null;

  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-sand py-20">
      <Container className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div>
          <h2 id="faq-title" className="font-display text-3xl font-semibold text-ink">
            {t('title')}
          </h2>
          <p className="mt-3 leading-relaxed text-ink-muted">{t('description')}</p>
          <Link
            href={ROUTES.contact}
            className="mt-4 inline-block rounded-sm font-semibold text-crimson-700 underline"
          >
            {t('messageSupport')}
          </Link>
        </div>
        <FaqList items={faqs} name="landing-faq" />
      </Container>
    </section>
  );
}
