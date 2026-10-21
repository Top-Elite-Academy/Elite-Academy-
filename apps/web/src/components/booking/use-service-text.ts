import type { PackageInfo } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useMoney } from '@/lib/format/use-money';

/**
 * Name and description of a bookable service, by package code
 * ("mentoring-8" → Booking.services.mentoring_8). A package without
 * translations yet falls back to its code rather than breaking the page.
 */
export function useServiceText() {
  const t = useTranslations('Booking.services');
  const money = useMoney();
  const key = (code: string) => code.replace(/-/g, '_') as 'mentoring_8';

  return {
    title: (code: string) => (t.has(`${key(code)}.title`) ? t(`${key(code)}.title`) : code),
    body: (pkg: PackageInfo) =>
      t.has(`${key(pkg.code)}.body`)
        ? t(`${key(pkg.code)}.body`, {
            perSession: money(Math.round(pkg.priceAgorot / pkg.sessions)),
          })
        : '',
  };
}
