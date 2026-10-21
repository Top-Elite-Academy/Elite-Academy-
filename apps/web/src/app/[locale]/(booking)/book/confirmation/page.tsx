import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';
import { Container } from '@/components/ui/Container';
import { bookingConfirmationPath } from '@/config/navigation';
import { requireUser } from '@/lib/auth/require-user';
import { isBookingId } from '@/lib/booking/booking-state';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Booking.confirmation');
  return { title: t('metaTitle'), robots: { index: false } };
}

/** Step 5 (spec §3.7): where the payment provider sends the booker back. */
export default async function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const bookingId = (await searchParams)['booking'];
  if (!isBookingId(bookingId)) notFound();
  await requireUser(bookingConfirmationPath(bookingId));
  return (
    <Container className="py-8 lg:py-12">
      <BookingConfirmation bookingId={bookingId} />
    </Container>
  );
}
