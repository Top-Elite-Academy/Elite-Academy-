import { cn } from '@/lib/cn';
import { FieldError, useFieldIds } from './FieldParts';

export interface Choice {
  value: string;
  label: string;
  /** Second line, e.g. "09:00–12:00". Always shown left-to-right. */
  detail?: string;
}

/**
 * Multiple choice shown as chips (spec §3.6 days and hours). Real checkboxes
 * under the hood: keyboard, screen readers and form data work natively.
 */
export function ChoiceGroup({
  name,
  legend,
  choices,
  error,
}: {
  name: string;
  legend: string;
  choices: Choice[];
  error?: string;
}) {
  const ids = useFieldIds(undefined, error);
  return (
    <fieldset aria-describedby={ids.describedBy} aria-invalid={error ? true : undefined}>
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {choices.map((choice) => (
          <label key={choice.value} className="relative">
            <input type="checkbox" name={name} value={choice.value} className="peer sr-only" />
            <span
              className={cn(
                'flex min-h-11 cursor-pointer flex-col justify-center rounded-[var(--radius-control)] border bg-white px-3.5 py-1.5 text-sm font-medium text-ink transition-colors',
                'peer-checked:border-crimson-700 peer-checked:bg-crimson-50 peer-checked:text-crimson-800',
                'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-crimson-700',
                error ? 'border-danger' : 'border-ink/30 hover:border-ink/60',
              )}
            >
              {choice.label}
              {choice.detail && (
                <span className="font-mono text-xs text-ink-muted" dir="ltr">
                  {choice.detail}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-1.5">
        <FieldError id={ids.errorId} text={error} />
      </div>
    </fieldset>
  );
}
