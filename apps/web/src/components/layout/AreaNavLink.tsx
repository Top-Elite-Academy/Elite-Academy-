'use client';

import type { ReactNode } from 'react';
import { STUDENT_ROUTES } from '@/config/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

/** Overview is current only on /app itself; the others also on their sub-pages. */
function useIsCurrent(href: string): boolean {
  const pathname = usePathname();
  if (href === STUDENT_ROUTES.overview) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const STYLES = {
  sidebar: {
    base: 'flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 font-medium text-ink hover:bg-sand',
    current: 'bg-crimson-50 font-semibold text-crimson-700 hover:bg-crimson-50',
  },
  tab: {
    base: 'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium text-ink-muted',
    current: 'font-semibold text-crimson-700',
  },
} as const;

/** A student area link that shows (and announces) the current page. */
export function StudentNavLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: keyof typeof STYLES;
  children: ReactNode;
}) {
  const current = useIsCurrent(href);
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
