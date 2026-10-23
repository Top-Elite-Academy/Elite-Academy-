'use client';

import { useTranslations } from 'next-intl';
import { ApiError } from './api-error';

/** Turns a failed API call into a sentence in the page language (unknown codes → generic). */
export function useErrorMessage() {
  const t = useTranslations('errors');
  return (caught: unknown): string => {
    const code = caught instanceof ApiError ? caught.code : 'generic';
    return t.has(code) ? t(code as 'generic') : t('generic');
  };
}
