import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A titled card on the student pages. `action` is a link shown next to the title. */
export function DashboardCard({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm sm:p-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Message and next step when a list is empty. */
export function EmptyState({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-control)] bg-cream px-4 py-6 text-center">
      <p className="text-ink-muted">{text}</p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
