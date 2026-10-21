import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { CONTROL_CLASS, FieldError, FieldLabel, useFieldIds } from './FieldParts';

interface TextAreaFieldProps extends Omit<ComponentProps<'textarea'>, 'id'> {
  name: string;
  label: string;
  optionalText?: string;
  error?: string;
}

export function TextAreaField({
  name,
  label,
  optionalText,
  error,
  required,
  className,
  ...props
}: TextAreaFieldProps) {
  const ids = useFieldIds(undefined, error);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={ids.id} label={label} required={required} optionalText={optionalText} />
      <textarea
        id={ids.id}
        name={name}
        required={required}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(CONTROL_CLASS, error ? 'border-danger' : 'border-ink/30')}
        {...props}
      />
      <FieldError id={ids.errorId} text={error} />
    </div>
  );
}
