'use client';

import { useTranslations } from 'next-intl';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ArrowForwardIcon } from '@/components/ui/icons';
import { ROUTES } from '@/config/navigation';
import { useMoney } from '@/lib/format/use-money';

interface NextAction {
  label: string;
  onClick: () => void;
}

/**
 * Back under the step; on phones the main action sits in a bar fixed to the
 * bottom of the screen with the total (on large screens it is in the summary).
 */
export function StepActions({
  onBack,
  next,
  totalAgorot,
}: {
  /** null on the first step: Back returns to the mentoring page. */
  onBack: (() => void) | null;
  next: NextAction | null;
  totalAgorot: number;
}) {
  const t = useTranslations('Booking');
  const money = useMoney();
  return (
    <>
      <div className="mt-8">
        {onBack ? (
          <Button variant="secondary" onClick={onBack}>
            {t('back')}
          </Button>
        ) : (
          <ButtonLink variant="secondary" href={ROUTES.mentoring}>
            {t('back')}
          </ButtonLink>
        )}
      </div>
      {next && (
        <div
          data-bottom-bar
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white px-4 py-3 shadow-[0_-4px_12px_rgb(0_0_0/0.06)] lg:hidden"
        >
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <p className="text-sm text-ink-muted">
              {t('summary.total')}{' '}
              <span className="block text-lg font-bold text-ink">{money(totalAgorot)}</span>
            </p>
            <ContinueButton {...next} />
          </div>
        </div>
      )}
    </>
  );
}

export function ContinueButton({ label, onClick }: NextAction) {
  return (
    <Button size="lg" onClick={onClick} className="w-full max-w-60 lg:max-w-none">
      {label}
      <ArrowForwardIcon className="size-4" />
    </Button>
  );
}
