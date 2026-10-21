import type { ReactNode } from 'react';
import { FieldError, useFieldIds } from './FieldParts';

/** A single checkbox with its label, e.g. the consent box. */
export function CheckboxField({
  name,
  label,
  error,
  required,
}: {
  name: string;
  label: ReactNode;
  error?: string;
  required?: boolean;
}) {
  const ids = useFieldIds(undefined, error);
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={ids.id}
          type="checkbox"
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className="mt-0.5 size-5 shrink-0 accent-crimson-700"
        />
        <label htmlFor={ids.id} className="text-sm text-ink">
          {label}
        </label>
      </div>
      <div className="mt-1.5 ps-8">
        <FieldError id={ids.errorId} text={error} />
      </div>
    </div>
  );
}
