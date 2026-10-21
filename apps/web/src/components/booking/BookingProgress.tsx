import { useTranslations } from 'next-intl';
import { CheckIcon } from '@/components/ui/icons';
import { BOOKING_STEPS, type BookingStep } from '@/lib/booking/booking-state';
import { cn } from '@/lib/cn';

/** The five booking steps (spec §3.7). Done steps get a tick; the current one is announced. */
export function BookingProgress({ current }: { current: BookingStep }) {
  const t = useTranslations('Booking');
  const currentIndex = BOOKING_STEPS.indexOf(current);

  return (
    <nav aria-label={t('progressLabel')}>
      <p className="text-sm font-semibold text-ink-muted sm:hidden">
        {t('stepOf', { current: currentIndex + 1, total: BOOKING_STEPS.length })}
        {' · '}
        {t(`steps.${current}`)}
      </p>
      <ol className="mt-2 flex gap-1.5 sm:mt-0 sm:gap-3">
        {BOOKING_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex flex-1 flex-col gap-2"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-1.5 rounded-full',
                  done || isCurrent ? 'bg-crimson-700' : 'bg-ink/15',
                )}
              />
              <span
                className={cn(
                  'max-sm:sr-only flex items-center gap-1.5 text-sm',
                  isCurrent ? 'font-semibold text-ink' : 'text-ink-muted',
                )}
              >
                {done && <CheckIcon className="size-4 text-crimson-700" />}
                {t(`steps.${step}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
