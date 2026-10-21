import type { ReactNode } from 'react';

/** Card that frames one section of the course page; `id` is the anchor used by the section tabs. */
export function CourseSection({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  /** Small text on the end side of the title, e.g. "6 units · 24 weeks". */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="text-2xl font-semibold text-ink">
          {title}
        </h2>
        {aside && <p className="text-sm text-ink-muted">{aside}</p>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
