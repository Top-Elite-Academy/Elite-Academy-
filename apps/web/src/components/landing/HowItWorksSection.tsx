import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { ArrowForwardIcon } from '@/components/ui/icons';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';

/**
 * Spec §3.1.4 — four step cards, each card one link with its call to action.
 * Step 03 goes to the student area; signed-out visitors are sent to sign-in first.
 */
const STEPS = [
  { key: 'choose', href: ROUTES.courses },
  { key: 'enroll', href: ROUTES.enroll },
  { key: 'learn', href: ROUTES.account },
  { key: 'career', href: ROUTES.careerAdvice },
] as const;

export function HowItWorksSection() {
  const t = useTranslations('Landing.how');

  return (
    <section aria-labelledby="how-title" className="bg-cream py-20">
      <Container>
        <SectionHeading id="how-title" title={t('title')} />
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.key} className="flex">
              <Link
                href={step.href}
                className="group flex w-full flex-col rounded-[var(--radius-card)] border-t-2 border-crimson-700 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="font-mono text-sm text-crimson-700" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-ink">{t(`${step.key}.title`)}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                  {t(`${step.key}.body`)}
                </p>
                <span className={buttonClasses({ size: 'sm' }, 'mt-4 self-start')}>
                  {t(`${step.key}.cta`)}
                  <ArrowForwardIcon className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
