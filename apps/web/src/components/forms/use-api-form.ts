'use client';

import { useTranslations } from 'next-intl';
import { type SyntheticEvent, useState } from 'react';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/api-error';

type FieldErrors = Record<string, string>;

interface SubmitOptions {
  /** Values not in the form fields, e.g. a captcha token or the link token. */
  extra?: Record<string, unknown>;
  /** Fields sent as lists (checkbox groups that share one name). */
  arrayFields?: string[];
  /** Single checkboxes sent as true/false. */
  booleanFields?: string[];
  /** Extra handling after the error is shown, e.g. reveal the captcha. */
  onError?: (error: ApiError) => void;
}

/**
 * Shared form behaviour: validate with the same Zod schema as the server,
 * show translated errors under each field, move focus to the first error
 * (spec §3.6), and map API errors back onto fields.
 */
export function useApiForm<S extends z.ZodType<Record<string, unknown>>>(schema: S) {
  const t = useTranslations('errors');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const translate = (code: string) => (t.has(code) ? t(code) : t('generic'));

  const showFieldErrors = (form: HTMLFormElement, errors: Record<string, string[]>) => {
    const translated: FieldErrors = {};
    for (const [field, codes] of Object.entries(errors))
      translated[field] = translate(codes[0] ?? 'generic');
    setFieldErrors(translated);
    const first = Object.keys(translated)[0];
    const element = first ? form.elements.namedItem(first) : null;
    // A checkbox group returns a list: focus its first box.
    const target = element instanceof RadioNodeList ? element[0] : element;
    if (target instanceof HTMLElement) target.focus();
    if (!element) setFormError(t('validation'));
  };

  const onSubmit =
    (action: (data: z.output<S>) => Promise<void>, options: SubmitOptions = {}) =>
    async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
      event.preventDefault();
      const form = event.currentTarget;
      setFormError(null);
      setFieldErrors({});

      const parsed = schema.safeParse({ ...valuesOf(form, options), ...options.extra });
      if (!parsed.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          // "days.0" → "days": errors belong to the form field, not to one list item.
          const field = issue.path[0]?.toString() ?? '_form';
          (errors[field] ??= []).push(issue.message);
        }
        showFieldErrors(form, errors);
        return;
      }

      setSubmitting(true);
      try {
        await action(parsed.data);
      } catch (error) {
        if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
          showFieldErrors(form, error.fieldErrors);
        } else {
          setFormError(translate(error instanceof ApiError ? error.code : 'generic'));
        }
        if (error instanceof ApiError) options.onError?.(error);
      } finally {
        setSubmitting(false);
      }
    };

  return { fieldErrors, formError, submitting, onSubmit, setFormError };
}

/** Form fields as a plain object (schemas decide what an empty field means). */
function valuesOf(form: HTMLFormElement, options: SubmitOptions): Record<string, unknown> {
  const data = new FormData(form);
  const values: Record<string, unknown> = {};
  for (const [key, value] of data.entries()) {
    if (typeof value === 'string') values[key] = value;
  }
  for (const key of options.arrayFields ?? []) values[key] = data.getAll(key);
  for (const key of options.booleanFields ?? []) values[key] = data.get(key) === 'on';
  return values;
}
