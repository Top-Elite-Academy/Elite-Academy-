import { type ComponentProps, useId } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

interface TextFieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  name: string;
  label: string;
  hint?: string;
  /** Already translated error message. */
  error?: string;
  /** Keep e.g. emails, codes and passwords left-to-right inside Arabic and Hebrew pages. */
  ltr?: boolean;
}

/**
 * Labelled input with hint and error linked through aria-describedby,
 * so screen readers announce them (WCAG 1.3.1, 3.3.1, 3.3.2).
 */
export function TextField({
  name,
  label,
  hint,
  error,
  ltr,
  required,
  className,
  ...props
}: TextFieldProps) {
  const t = useTranslations('Forms');
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="text-crimson-700">
            {' '}
            *<span className="sr-only">{t('required')}</span>
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        dir={ltr ? 'ltr' : undefined}
        className={cn(
          'min-h-11 rounded-[var(--radius-control)] border bg-white px-3 py-2 text-base text-ink',
          ltr && 'text-start rtl:text-end',
          error ? 'border-danger' : 'border-ink/30',
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
