import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { ROUTES } from '@/config/navigation';

/** "Page not found" with ways back to Home and Courses (spec §2). */
export function NotFoundContent() {
  const t = useTranslations('NotFound');
  return (
    <Container className="py-24 text-center">
      <h1 className="text-3xl font-bold text-ink">{t('title')}</h1>
      <p className="mt-3 text-ink-muted">{t('body')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href={ROUTES.home}>{t('home')}</ButtonLink>
        <ButtonLink href={ROUTES.courses} variant="secondary">
          {t('courses')}
        </ButtonLink>
      </div>
    </Container>
  );
}
