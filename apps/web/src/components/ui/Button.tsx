import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'outlineLight' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  /** Crimson — the main action on light backgrounds. */
  primary: 'bg-crimson-700 text-white hover:bg-crimson-800',
  /** White with a thin border — secondary action on light backgrounds. */
  secondary: 'border border-ink/25 bg-white text-ink hover:border-ink/50 hover:bg-cream',
  /** Gold — the main action on maroon backgrounds. */
  gold: 'bg-gold-400 text-ink hover:bg-gold-300',
  /** Outlined — secondary action on maroon backgrounds. */
  outlineLight: 'border border-white/60 text-white hover:bg-white/10',
  ghost: 'text-ink hover:bg-sand',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 py-2 text-sm',
  md: 'min-h-11 px-5 py-2.5 text-sm',
  lg: 'min-h-12 px-7 py-3 text-base',
};

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function buttonClasses({ variant = 'primary', size = 'md' }: StyleProps, extra?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], extra);
}

/** A real <button> for actions. */
export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & StyleProps) {
  return <button type={type} className={buttonClasses({ variant, size }, className)} {...props} />;
}

/** A link that looks like a button, for navigation (keeps correct semantics for screen readers). */
export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClasses({ variant, size }, className)} {...props} />;
}
