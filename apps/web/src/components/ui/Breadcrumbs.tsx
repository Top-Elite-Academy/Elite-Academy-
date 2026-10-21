import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export interface Crumb {
  label: string;
  /** Omit for the current page. */
  href?: string;
}

/** Home › … › current page (spec §2). Each crumb links back; the last is the current page. */
export function Breadcrumbs({ items, onDark = false }: { items: Crumb[]; onDark?: boolean }) {
  const t = useTranslations('Breadcrumbs');
  return (
    <nav aria-label={t('label')} className="text-sm">
      <ol
        className={cn(
          'flex flex-wrap items-center gap-2',
          onDark ? 'text-white/85' : 'text-ink-muted',
        )}
      >
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link
                href={item.href}
                className={cn('rounded-sm underline', onDark ? 'text-white' : 'text-crimson-700')}
              >
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
