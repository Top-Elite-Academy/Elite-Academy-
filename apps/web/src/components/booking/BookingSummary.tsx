'use client';

import type { MentorCard, PackageInfo } from '@eta/shared';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { MentorAvatar } from '@/components/mentoring/MentorAvatar';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { useMoney } from '@/lib/format/use-money';
import { useServiceText } from './use-service-text';

/** "Booking summary" panel next to every step (design "Booking flow · Step 1"). */
export function BookingSummary({
  pkg,
  mentor,
  startAt,
  children,
}: {
  pkg: PackageInfo | undefined;
  mentor: MentorCard | undefined;
  startAt: string | null;
  /** The step's main action, shown under the total on large screens. */
  children?: ReactNode;
}) {
  const t = useTranslations('Booking');
  const money = useMoney();
  const when = useBookingFormat();
  const service = useServiceText();

  return (
    <aside
      aria-labelledby="booking-summary-title"
      className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm"
    >
      <h2 id="booking-summary-title" className="font-semibold text-ink">
        {t('summary.title')}
      </h2>
      {mentor && (
        <div className="mt-4 flex items-center gap-3">
          <MentorAvatar name={mentor.name} photoPath={mentor.photoPath} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-ink">{mentor.name}</p>
            <p className="truncate text-sm text-ink-muted">
              {mentor.program?.title ?? mentor.role}
            </p>
          </div>
        </div>
      )}
      <dl className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
        <Row label={t('summary.service')}>{pkg ? service.title(pkg.code) : t('summary.none')}</Row>
        <Row label={t('summary.length')}>
          {pkg ? t('summary.minutes', { minutes: pkg.sessionMinutes }) : t('summary.none')}
        </Row>
        <Row label={t('summary.when')}>
          {startAt ? (
            <>
              {when.longDay(startAt)} · <span dir="ltr">{when.time(startAt)}</span>
            </>
          ) : (
            t('summary.none')
          )}
        </Row>
        <Row label={t('summary.timeZone')}>{t('zone.jerusalem')}</Row>
      </dl>
      <dl className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
        <dt className="font-semibold text-ink">{t('summary.total')}</dt>
        <dd className="text-2xl font-bold text-ink">
          {pkg ? money(pkg.priceAgorot) : t('summary.none')}
        </dd>
      </dl>
      {children && <div className="mt-5 hidden lg:block">{children}</div>}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-end font-semibold text-ink">{children}</dd>
    </div>
  );
}
