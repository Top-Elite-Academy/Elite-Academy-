import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export interface Crumb {
  label: string;
  /** Omit for the current page. */
  href?: string;
}

/** Home › … › current page (spec §2). Each crumb links back; the last is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations('Breadcrumbs');
  return (
    <nav aria-label={t('label')} className="text-sm">
      <ol className="flex flex-wrap items-center gap-2 text-ink-muted">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link href={item.href} className="rounded-sm text-crimson-700 underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
