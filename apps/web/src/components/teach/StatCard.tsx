import type { ReactNode } from 'react';

/** A number with its label and a short note (design "Instructor 1" top row). */
export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold text-ink">{value}</p>
      {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
    </div>
  );
}
