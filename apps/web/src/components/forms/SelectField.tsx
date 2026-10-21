import type { ComponentProps } from 'react';
import { ChevronDownIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { CONTROL_CLASS, FieldError, FieldLabel, useFieldIds } from './FieldParts';

interface SelectFieldProps extends Omit<ComponentProps<'select'>, 'id'> {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
}

/** Labelled native <select> (keyboard and screen-reader friendly by default). */
export function SelectField({
  name,
  label,
  options,
  placeholder,
  error,
  required,
  className,
  ...props
}: SelectFieldProps) {
  const ids = useFieldIds(undefined, error);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={ids.id} label={label} required={required} />
      <div className="relative">
        <select
          id={ids.id}
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className={cn(
            CONTROL_CLASS,
            'min-h-11 appearance-none pe-10',
            error ? 'border-danger' : 'border-ink/30',
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
      </div>
      <FieldError id={ids.errorId} text={error} />
    </div>
  );
}
