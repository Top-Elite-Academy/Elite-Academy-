import type { StudentOrder } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useServiceText } from '@/components/booking/use-service-text';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { useCohortFormat } from '@/lib/format/use-cohort-format';
import { useMoney } from '@/lib/format/use-money';
import { RetryPaymentButton } from './RetryPaymentButton';

const TONE: Record<StudentOrder['status'], BadgeTone> = {
  paid: 'sage',
  failed: 'gold',
  refunded: 'slate',
  pending: 'neutral',
};

/** One order: what, when, how much, status — and "Try again" while still possible. */
export function PaymentRow({ order }: { order: StudentOrder }) {
  const t = useTranslations();
  const service = useServiceText();
  const money = useMoney();
  const dates = useCohortFormat();
  const reasonKey = `Booking.confirmation.reasons.${order.failureReason ?? 'failed'}`;
  const reason = t.has(reasonKey)
    ? t(reasonKey as 'Booking.confirmation.reasons.failed')
    : t('Booking.confirmation.reasons.failed');

  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-semibold text-ink">{service.title(order.service)}</h2>
        <p className="text-sm text-ink-muted">
          {t('Student.payments.sessions', { count: order.sessions })} ·{' '}
          {dates.longDate(order.createdAt.slice(0, 10))}
        </p>
        {order.status === 'failed' && (
          <p className="mt-1 text-sm text-ink-muted">{t('Student.payments.reason', { reason })}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <span className="text-lg font-bold text-ink">{money(order.amountAgorot)}</span>
        <Badge tone={TONE[order.status]}>{t(`Student.payments.statuses.${order.status}`)}</Badge>
        {order.retryBookingId && <RetryPaymentButton bookingId={order.retryBookingId} />}
      </div>
    </article>
  );
}
