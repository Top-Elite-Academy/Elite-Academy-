import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TestCheckout } from '@/components/booking/TestCheckout';
import { Container } from '@/components/ui/Container';
import { requireUser } from '@/lib/auth/require-user';
import { isBookingId } from '@/lib/booking/booking-state';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Booking.testCheckout');
  return { title: t('metaTitle'), robots: { index: false } };
}

/**
 * Stand-in for the payment provider's hosted page while PAYMENT_PROVIDER=test
 * (development and tests only; the API refuses test payments otherwise).
 */
export default async function TestCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env['PAYMENT_PROVIDER'] !== 'test') notFound();
  const bookingId = (await searchParams)['booking'];
  if (!isBookingId(bookingId)) notFound();
  await requireUser(`/book/test-checkout?booking=${bookingId}`);
  return (
    <Container className="py-12">
      <TestCheckout bookingId={bookingId} />
    </Container>
  );
}
