'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { DEFAULT_QUERY } from '@/config/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

/**
 * True when `href` is the current page (or a page under it): same path and, if the link has a query
 * (e.g. ?tab=career), the same values — a missing value counts as the page default.
 * Links to a section (#stories) never match.
 */
function useIsCurrent(href: string): boolean {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (href.includes('#')) return false;
  const target = new URL(href, 'http://local');
  // Sub-pages count too: /courses/full-stack-advanced-ai is under "Courses".
  const samePage = target.pathname === pathname;
  const subPage = target.pathname !== '/' && pathname.startsWith(`${target.pathname}/`);
  if (!samePage && !subPage) return false;
  return [...target.searchParams].every(
    ([key, value]) => (searchParams.get(key) ?? DEFAULT_QUERY[key]) === value,
  );
}

/** Header link with the "current page" state (aria-current + underline). */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const current = useIsCurrent(href);
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'rounded-[var(--radius-control)] px-2.5 py-2 text-[0.95rem] font-medium text-ink hover:text-crimson-700',
        current && 'text-crimson-700 underline decoration-2 underline-offset-[1.4rem]',
      )}
    >
      {children}
    </Link>
  );
}
