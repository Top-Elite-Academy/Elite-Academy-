import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Message above a form. Errors are announced immediately (role="alert"), success politely. */
export function FormAlert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-[var(--radius-control)] border px-4 py-3 text-sm font-medium',
        tone === 'error'
          ? 'border-danger bg-crimson-50 text-danger'
          : 'border-success bg-white text-success',
      )}
    >
      {children}
    </div>
  );
}
