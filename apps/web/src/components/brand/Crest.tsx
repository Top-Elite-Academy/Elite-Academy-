import { cn } from '@/lib/cn';

/**
 * ⚠ PLACEHOLDER crest (shield shape in brand colours). Replace with the real
 * crest SVG from the EliteTech design system when it is added to docs/design.
 */
export function Crest({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 48"
      aria-hidden="true"
      focusable="false"
      className={cn('h-10 w-auto', className)}
    >
      <path
        d="M20 2 37 8v14c0 11-7.5 19-17 24C10.5 41 3 33 3 22V8L20 2Z"
        fill="var(--color-navy-900)"
      />
      <path
        d="M20 6.5 33 11v11c0 8.6-5.6 15-13 19.3C12.6 37 7 30.6 7 22V11l13-4.5Z"
        fill="var(--color-crimson-600)"
      />
      <path
        d="M13 16h14M13 22h10M13 28h14M13 16v12"
        stroke="var(--color-gold-400)"
        strokeWidth="2.5"
        fill="none"
      />
    </svg>
  );
}
