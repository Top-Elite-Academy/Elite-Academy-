import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { CONTROL_CLASS, FieldError, FieldHint, FieldLabel, useFieldIds } from './FieldParts';

interface TextFieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  name: string;
  label: string;
  hint?: string;
  /** Shown after the label, e.g. "(optional)". */
  optionalText?: string;
  /** Already translated error message. */
  error?: string;
  /** Keep e.g. emails, phones, codes and passwords left-to-right inside Arabic and Hebrew pages. */
  ltr?: boolean;
}

/** Labelled input with hint and error linked for screen readers. */
export function TextField({
  name,
  label,
  hint,
  optionalText,
  error,
  ltr,
  required,
  className,
  ...props
}: TextFieldProps) {
  const ids = useFieldIds(hint, error);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={ids.id} label={label} required={required} optionalText={optionalText} />
      <FieldHint id={ids.hintId} text={hint} />
      <input
        id={ids.id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        dir={ltr ? 'ltr' : undefined}
        className={cn(
          CONTROL_CLASS,
          'min-h-11',
          ltr && 'text-start rtl:text-end',
          error ? 'border-danger' : 'border-ink/30',
        )}
        {...props}
      />
      <FieldError id={ids.errorId} text={error} />
    </div>
  );
}
