import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';

const BLOCK = 'rounded-[var(--radius-control)] bg-sand motion-safe:animate-pulse';

/**
 * Shown by the loading.tsx files while the next page renders on the server,
 * so a click gets an immediate response instead of a frozen page. Screen
 * readers hear "Loading…"; the placeholder shapes are hidden from them.
 */
export function PageLoading() {
  const t = useTranslations('A11y');
  return (
    <Container className="py-10" role="status">
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden="true" className="space-y-6">
        <div className={`${BLOCK} h-8 w-2/3 max-w-md`} />
        <div className={`${BLOCK} h-4 w-full max-w-2xl`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className={`${BLOCK} h-40`} />
          ))}
        </div>
      </div>
    </Container>
  );
}
