'use client';

import type { CohortInfo } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { ArrowForwardIcon, CheckIcon, MessageIcon, PhoneIcon } from '@/components/ui/icons';
import { enrollPath, ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { useCohortFormat } from '@/lib/format/use-cohort-format';
import { CohortPicker } from './CohortPicker';
import { FEW_SEATS } from './sections/ScheduleSection';

const INCLUDED = ['live', 'recordings', 'projects', 'practical', 'certificate'] as const;

/**
 * Enrollment card (spec §3.3): sticky beside the content on desktop; on phones it
 * sits under the header and a bar with the Enroll button stays fixed at the bottom.
 * No price is shown — "No payment now".
 */
export function EnrollmentPanel({
  slug,
  lengthWeeks,
  cohorts,
}: {
  slug: string;
  lengthWeeks: number | null;
  cohorts: CohortInfo[];
}) {
  const t = useTranslations('Course');
  const [selectedId, setSelectedId] = useState(cohorts.find((c) => c.status === 'open')?.id);
  const selected = cohorts.find((cohort) => cohort.id === selectedId);
  const href = enrollPath(slug, selected?.id);

  return (
    <>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-lg">
        <div className="p-5">
          <CohortBand cohort={selected} lengthWeeks={lengthWeeks} />
          {cohorts.length > 0 && (
            <div className="mt-5">
              <CohortPicker cohorts={cohorts} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          )}
          <ButtonLink href={href} size="lg" className="mt-5 w-full">
            {t('card.enroll')}
            <ArrowForwardIcon className="size-4" />
          </ButtonLink>
          <p className="mt-4 flex gap-3 text-sm text-ink-muted">
            <PhoneIcon className="mt-0.5 size-4 text-sage-700" />
            <span>
              <strong className="font-semibold text-ink">{t('card.noPayment')}</strong>{' '}
              {t('card.noPaymentBody')}
            </span>
          </p>
        </div>

        <div className="border-t border-border p-5">
          <h2 className="text-sm font-semibold text-ink-muted">{t('card.included')}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckIcon className="size-4 text-crimson-700" />
                {t(`card.includedItems.${item}`)}
              </li>
            ))}
          </ul>
          <Link
            href={ROUTES.contact}
            className="mt-5 flex items-center gap-3 rounded-[var(--radius-control)] border border-border bg-cream p-3 text-sm hover:border-ink/40"
          >
            <span className="flex-1">
              <span className="block font-semibold text-ink">{t('card.question')}</span>
              <span className="block text-ink-muted">{t('card.questionBody')}</span>
            </span>
            <MessageIcon className="size-5 text-ink" />
          </Link>
        </div>
      </div>

      <MobileEnrollBar href={href} cohort={selected} />
    </>
  );
}

function CohortBand({
  cohort,
  lengthWeeks,
}: {
  cohort: CohortInfo | undefined;
  lengthWeeks: number | null;
}) {
  const t = useTranslations('Course');
  const format = useCohortFormat();
  return (
    <div className="on-dark rounded-[var(--radius-control)] border-b-4 border-gold-700 bg-maroon-900 bg-dots p-4 text-white">
      <p className="font-mono text-xs text-gold-300">{t('card.nextCohort')}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-ivory">
        {cohort ? format.dayMonth(cohort.startDate) : t('card.noDates')}
      </p>
      {cohort?.schedule && (
        <p className="mt-1 text-sm text-white/85">
          {format.days(cohort.schedule)} · <bdi dir="ltr">{format.time(cohort.schedule)}</bdi>
          {lengthWeeks ? ` · ${t('stats.weeks', { weeks: lengthWeeks })}` : ''}
        </p>
      )}
      {cohort && cohort.seatsLeft <= FEW_SEATS && (
        <span className="mt-3 inline-block rounded-full bg-gold-400 px-2.5 py-1 text-xs font-semibold text-ink">
          {t('card.fewSeats', { count: cohort.seatsLeft })}
        </span>
      )}
    </div>
  );
}

/** Phones only: the Enroll button stays reachable while scrolling (spec §3.3). */
function MobileEnrollBar({ href, cohort }: { href: string; cohort: CohortInfo | undefined }) {
  const t = useTranslations('Course.card');
  const format = useCohortFormat();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-white px-4 py-3 shadow-[0_-4px_12px_rgb(0_0_0/0.06)] lg:hidden">
      <p className="flex-1 text-sm">
        <span className="block text-ink-muted">{t('nextCohort')}</span>
        <span className="block font-semibold text-ink">
          {cohort ? format.dayMonth(cohort.startDate) : t('noDates')}
        </span>
      </p>
      <ButtonLink href={href}>{t('enroll')}</ButtonLink>
    </div>
  );
}
