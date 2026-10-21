import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountShell } from '@/components/account/AccountShell';

export const metadata: Metadata = { robots: { index: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
