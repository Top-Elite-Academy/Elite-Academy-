import type { AttentionItem } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { ProgressBadge } from '@/components/teach/ProgressBadge';
import { teachStudentPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';

/** Students whose attendance puts them behind or at risk, at risk first (design "Instructor 1"). */
export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  const t = useTranslations('Teach.attention');
  if (items.length === 0) return <p className="text-sm text-ink-muted">{t('empty')}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <li
          key={`${item.cohortId}-${item.userId}`}
          className="flex flex-wrap items-center gap-3 py-3"
        >
          <Link
            href={teachStudentPath(item.cohortId, item.userId)}
            className="min-w-0 flex-1 font-semibold text-crimson-700 underline"
          >
            {`${item.firstName} ${item.lastName}`}
          </Link>
          <span className="text-sm text-ink-muted">
            {t('detail', { cohort: item.cohortName, rate: item.rate })}
          </span>
          <ProgressBadge progress={item.status} />
        </li>
      ))}
    </ul>
  );
}
