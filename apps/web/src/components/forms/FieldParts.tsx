import { useTranslations } from 'next-intl';
import { useId } from 'react';

/**
 * Shared pieces of every form field: ids that link the label, hint and error
 * to the control (aria-describedby), so screen readers announce them
 * (WCAG 1.3.1, 3.3.1, 3.3.2).
 */
export function useFieldIds(hint?: string, error?: string) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return {
    id,
    hintId,
    errorId,
    describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined,
  };
}

export function FieldLabel({
  htmlFor,
  id,
  label,
  required,
  optionalText,
}: {
  htmlFor?: string;
  id?: string;
  label: string;
  required?: boolean;
  /** Shown after the label, e.g. "(optional)". */
  optionalText?: string;
}) {
  const t = useTranslations('Forms');
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag htmlFor={htmlFor} id={id} className="text-sm font-semibold text-ink">
      {label}
      {required && (
        <span className="text-crimson-700">
          {' *'}
          <span className="sr-only">{t('required')}</span>
        </span>
      )}
      {optionalText && <span className="font-normal text-ink-muted">{` ${optionalText}`}</span>}
    </Tag>
  );
}

export function FieldHint({ id, text }: { id: string | undefined; text: string | undefined }) {
  if (!id || !text) return null;
  return (
    <p id={id} className="text-sm text-ink-muted">
      {text}
    </p>
  );
}

export function FieldError({ id, text }: { id: string | undefined; text: string | undefined }) {
  if (!id || !text) return null;
  return (
    <p id={id} className="text-sm font-medium text-danger">
      {text}
    </p>
  );
}

export const CONTROL_CLASS =
  'w-full rounded-[var(--radius-control)] border bg-white px-3 py-2 text-base text-ink';
