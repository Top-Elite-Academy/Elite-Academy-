import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export interface PillNavItem {
  key: string;
  href: string;
  label: string;
  current: boolean;
}

/** A row of rounded links where one is the current choice (program, cohort, filter). */
export function PillNav({ label, items }: { label: string; items: PillNavItem[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.current ? 'page' : undefined}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-semibold',
            item.current
              ? 'border-ink bg-ink text-white'
              : 'border-ink/25 bg-white text-ink hover:border-ink/50',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
