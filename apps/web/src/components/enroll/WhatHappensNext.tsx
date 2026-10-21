import { useTranslations } from 'next-intl';

const STEPS = ['1', '2', '3'] as const;

/** Side panel (spec §3.6): we call you → we explain price and installments → you choose a cohort. */
export function WhatHappensNext() {
  const t = useTranslations('Enroll.next');
  return (
    <section
      aria-labelledby="next-title"
      className="rounded-[var(--radius-card)] border border-border bg-white p-5"
    >
      <h2 id="next-title" className="font-semibold text-ink">
        {t('title')}
      </h2>
      <ol className="mt-4 space-y-4">
        {STEPS.map((step) => (
          <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-crimson-50 text-xs font-semibold text-crimson-700"
            >
              {step}
            </span>
            <p>
              <strong className="font-semibold">{t(`step${step}Lead`)}</strong> {t(`step${step}`)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
