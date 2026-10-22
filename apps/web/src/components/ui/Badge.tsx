import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'gold' | 'neutral' | 'sage' | 'slate' | 'danger';

const TONES: Record<BadgeTone, string> = {
  gold: 'bg-gold-100 text-gold-700',
  neutral: 'bg-sand text-ink',
  sage: 'bg-sage-100 text-sage-700',
  slate: 'bg-slate-100 text-slate-700',
  danger: 'bg-crimson-50 text-crimson-700',
};

/** Small label chip, optionally with an icon (e.g. "Program", "Beginner"). */
export function Badge({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
        TONES[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}
