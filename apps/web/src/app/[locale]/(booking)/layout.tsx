import type { ReactNode } from 'react';
import { BookingShell } from '@/components/booking/BookingShell';

export default function BookingLayout({ children }: { children: ReactNode }) {
  return <BookingShell>{children}</BookingShell>;
}
