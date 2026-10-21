'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export const COURSE_SECTIONS = [
  'overview',
  'outcomes',
  'curriculum',
  'schedule',
  'access',
  'instructor',
  'faq',
] as const;
export type CourseSectionId = (typeof COURSE_SECTIONS)[number];

/**
 * In-page tabs (spec §3.3): anchor links that scroll to a section and highlight
 * the section currently on screen. Sticky under the header; scrolls sideways on phones.
 */
export function CourseSectionNav({ sections }: { sections: CourseSectionId[] }) {
  const t = useTranslations('Course.nav');
  const [current, setCurrent] = useState<CourseSectionId | undefined>(sections[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setCurrent(top.target.id as CourseSectionId);
      },
      // A section counts as current while it crosses the band just below the sticky bars.
      { rootMargin: '-140px 0px -60% 0px' },
    );
    for (const id of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [sections]);

  return (
    <nav
      aria-label={t('label')}
      className="sticky top-[4.5rem] z-20 -mx-4 border-b border-border bg-cream/95 px-4 backdrop-blur sm:mx-0 sm:px-0"
    >
      <ul className="flex gap-1 overflow-x-auto">
        {sections.map((id) => (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              aria-current={current === id ? 'true' : undefined}
              className={cn(
                'block border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap',
                current === id
                  ? 'border-crimson-700 text-crimson-700'
                  : 'border-transparent text-ink hover:text-crimson-700',
              )}
            >
              {t(id)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
