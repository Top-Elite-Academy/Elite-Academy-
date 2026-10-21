import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

export function SubmitButton({
  submitting,
  children,
}: {
  submitting: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('Forms');
  return (
    <Button
      type="submit"
      size="lg"
      disabled={submitting}
      aria-disabled={submitting}
      className="w-full"
    >
      {submitting ? t('submitting') : children}
    </Button>
  );
}
