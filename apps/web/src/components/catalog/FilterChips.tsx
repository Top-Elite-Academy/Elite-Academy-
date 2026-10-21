'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

interface FilterChipsProps<T extends string> {
  legend: string;
  allLabel: string;
  options: readonly T[];
  labelOf: (option: T) => string;
  selected: T[];
  onChange: (selected: T[]) => void;
}

const CHIP =
  'min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white';

/**
 * Multi-select chips (spec §3.2). Each chip is a toggle button (aria-pressed);
 * "All" clears the group.
 */
export function FilterChips<T extends string>({
  legend,
  allLabel,
  options,
  labelOf,
  selected,
  onChange,
}: FilterChipsProps<T>) {
  const legendId = useId();
  const toggle = (option: T) => {
    onChange(
      selected.includes(option)
        ? selected.filter((value) => value !== option)
        : options.filter((value) => value === option || selected.includes(value)),
    );
  };

  return (
    <div role="group" aria-labelledby={legendId}>
      <p id={legendId} className="text-sm font-semibold text-ink">
        {legend}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={selected.length === 0}
          onClick={() => {
            onChange([]);
          }}
          className={cn(CHIP, 'border-ink/25 bg-white text-ink')}
        >
          {allLabel}
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={selected.includes(option)}
            onClick={() => {
              toggle(option);
            }}
            className={cn(CHIP, 'border-ink/25 bg-white text-ink hover:border-ink/50')}
          >
            {labelOf(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
