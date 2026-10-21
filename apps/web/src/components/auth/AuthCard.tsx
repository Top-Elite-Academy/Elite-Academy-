import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';

/** Centred card used by every sign-in related page. */
export function AuthCard({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <Container className="flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
        {intro && <p className="mt-2 text-ink-muted">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </Container>
  );
}
