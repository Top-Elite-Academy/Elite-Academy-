import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'onDark';
export type ButtonSize = 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-60 min-h-11';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-crimson-600 text-white hover:bg-crimson-700 active:bg-crimson-800',
  secondary: 'border-2 border-navy-800 text-navy-900 hover:bg-navy-50',
  ghost: 'text-navy-900 hover:bg-navy-50',
  onDark: 'bg-gold-400 text-navy-900 hover:bg-gold-300',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
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
