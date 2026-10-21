import type { StudentPackage } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useServiceText } from '@/components/booking/use-service-text';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { DashboardCard } from './DashboardCard';

/** "3 of 8 meetings used" with a progress bar and the next meeting (spec §4.3). */
export function PackageCard({ pkg }: { pkg: StudentPackage }) {
  const t = useTranslations('Student.overview');
  const service = useServiceText();
  const when = useBookingFormat();
  const percent = Math.round((pkg.used / pkg.total) * 100);
  const used = t('packageUsed', { used: pkg.used, total: pkg.total });

  return (
    <DashboardCard title={t('packageTitle')}>
      <p className="font-semibold text-ink">{service.title(pkg.service)}</p>
      {pkg.mentor && (
        <p className="text-sm text-ink-muted">{t('packageMentor', { name: pkg.mentor.name })}</p>
      )}
      <p className="mt-4 text-sm font-semibold text-ink">{used}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={pkg.total}
        aria-valuenow={pkg.used}
        aria-valuetext={used}
        aria-label={t('packageTitle')}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-sand"
      >
        <div className="h-full rounded-full bg-crimson-700" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        {pkg.nextSessionAt ? (
          <>
            {t('packageNext', { when: when.longDay(pkg.nextSessionAt) })} ·{' '}
            <span dir="ltr">{when.time(pkg.nextSessionAt)}</span>
          </>
        ) : (
          t('packageNoNext')
        )}
      </p>
    </DashboardCard>
  );
}
