'use client';

import { useTranslations } from 'next-intl';
import { type SyntheticEvent, useState } from 'react';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/api-error';

type FieldErrors = Record<string, string>;

interface SubmitOptions {
  /** Values not in the form fields, e.g. a captcha token or the link token. */
  extra?: Record<string, unknown>;
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
    if (element instanceof HTMLElement) element.focus();
    if (!element) setFormError(t('validation'));
  };

  const onSubmit =
    (action: (data: z.output<S>) => Promise<void>, options: SubmitOptions = {}) =>
    async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
      event.preventDefault();
      const form = event.currentTarget;
      setFormError(null);
      setFieldErrors({});

      const parsed = schema.safeParse({
        ...Object.fromEntries(new FormData(form)),
        ...options.extra,
      });
      if (!parsed.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path.join('.') || '_form';
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
