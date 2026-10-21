import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Section title in the display font, with an optional description and an action on the end side. */
export function SectionHeading({
  id,
  title,
  description,
  action,
  className,
}: {
  /** Used by the section's aria-labelledby. */
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-6', className)}>
      <div className="max-w-2xl">
        <h2 id={id} className="font-display text-3xl font-semibold text-ink sm:text-[2rem]">
          {title}
        </h2>
        {description && <p className="mt-3 leading-relaxed text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
