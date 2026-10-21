import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A native radio button styled as a card: arrow keys, Space and screen readers
 * work as with any radio group; the focus ring sits on the whole card.
 */
export function RadioCard({
  name,
  value,
  checked,
  onSelect,
  className,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer rounded-[var(--radius-card)] border bg-white transition-shadow hover:shadow-md',
        checked ? 'border-2 border-crimson-700 shadow-md' : 'border-border',
        'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-crimson-700',
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => {
          onSelect(value);
        }}
        className="sr-only"
      />
      {children}
    </label>
  );
}

/** The round marker inside a card, filled when chosen. */
export function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
        checked ? 'border-crimson-700' : 'border-ink/30',
      )}
    >
      {checked && <span className="size-2.5 rounded-full bg-crimson-700" />}
    </span>
  );
}
