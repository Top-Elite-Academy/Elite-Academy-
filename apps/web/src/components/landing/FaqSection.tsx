import type { FaqItem } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { PlusIcon } from '@/components/ui/icons';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';

/**
 * Spec §3.1.7 (#faq). Native <details> elements sharing one `name`: the browser
 * keeps one question open at a time, with keyboard support and no JavaScript.
 */
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

        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.key}
              name="landing-faq"
              className="group rounded-[var(--radius-control)] border border-border bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {faq.question}
                <PlusIcon className="size-5 text-crimson-700 transition-transform group-open:rotate-45" />
              </summary>
              <p className="px-5 pb-5 leading-relaxed text-ink-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
