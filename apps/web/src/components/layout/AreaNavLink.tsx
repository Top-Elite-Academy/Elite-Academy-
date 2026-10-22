'use client';

import type { ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

const STYLES = {
  /** White sidebar (student area). */
  sidebar: {
    base: 'flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 font-medium text-ink hover:bg-sand',
    current: 'bg-crimson-50 font-semibold text-crimson-700 hover:bg-crimson-50',
  },
  /** Maroon sidebar (instructor area, design "Instructor 1"). */
  dark: {
    base: 'flex items-center gap-3 rounded-[var(--radius-control)] border border-transparent px-3 py-2.5 font-medium text-white/85 hover:bg-white/10 hover:text-white',
    current: 'border-gold-400/60 bg-white/10 font-semibold text-white',
  },
  /** Bottom tab bar on phones. */
  tab: {
    base: 'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium text-ink-muted',
    current: 'font-semibold text-crimson-700',
  },
} as const;

/**
 * Link in a signed-in area's navigation, marked as the current page (aria-current).
 * `exact`: current only on that page itself (e.g. Overview at /app), not on pages under it.
 */
export function AreaNavLink({
  href,
  variant,
  exact = false,
  children,
}: {
  href: string;
  variant: keyof typeof STYLES;
  exact?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current = pathname === href || (!exact && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(STYLES[variant].base, current && STYLES[variant].current)}
    >
      {children}
    </Link>
  );
}
