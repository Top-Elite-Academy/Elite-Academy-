import type { StudentOrder } from '@eta/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/student/DashboardCard';
import { PaymentRow } from '@/components/student/PaymentRow';
import { getAsUser } from '@/lib/api/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Student.payments');
  return { title: t('metaTitle') };
}

/** Payments and orders (spec §4.6). No card data is ever shown or stored. */
export default async function StudentPaymentsPage() {
  const [orders, t] = await Promise.all([
    getAsUser<StudentOrder[]>('/api/me/orders'),
    getTranslations('Student.payments'),
  ]);
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
      <p className="mt-2 text-ink-muted">{t('intro')}</p>
      <div className="mt-6">
        {orders.length === 0 ? (
          <EmptyState text={t('empty')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <PaymentRow order={order} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
