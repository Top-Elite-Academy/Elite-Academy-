'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

/** 500 page: a friendly message and no technical details (spec §2, §9.3). */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('ServerError');
  return (
    <Container className="py-24 text-center">
      <h1 className="text-3xl font-bold text-navy-900">{t('title')}</h1>
      <p className="mt-3 text-ink-muted">{t('body')}</p>
      <Button className="mt-8" onClick={reset}>
        {t('retry')}
      </Button>
    </Container>
  );
}
