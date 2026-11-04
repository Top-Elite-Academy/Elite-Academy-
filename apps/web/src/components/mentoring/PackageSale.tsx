import type { PackageInfo } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { packageSaving } from '@/lib/booking/package-saving';
import { useMoney } from '@/lib/format/use-money';

/**
 * The sale on a package: the price of the same sessions one by one, crossed
 * out, and how much the package saves. Nothing for single sessions.
 */
export function PackageSale({ pkg, packages }: { pkg: PackageInfo; packages: PackageInfo[] }) {
  const t = useTranslations('Mentoring.sale');
  const money = useMoney();
  const saving = packageSaving(pkg, packages);
  if (!saving) return null;
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      <s className="text-ink-muted" aria-hidden="true">
        {money(saving.fullAgorot)}
      </s>
      <span className="sr-only">{t('instead', { price: money(saving.fullAgorot) })}</span>
      <Badge tone="sage">{t('save', { amount: money(saving.savedAgorot) })}</Badge>
    </span>
  );
}
