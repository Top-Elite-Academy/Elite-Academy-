import Image from 'next/image';
import { cn } from '@/lib/cn';

/** Round mentor photo, or their initials when there is none. Decorative: the name is next to it. */
export function MentorAvatar({
  name,
  photoPath,
  size = 'md',
}: {
  name: string;
  photoPath: string | null;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'size-10' : 'size-12';
  if (photoPath) {
    return (
      <span
        className={cn(
          'relative shrink-0 overflow-hidden rounded-full border border-gold-500/60',
          box,
        )}
      >
        <Image src={photoPath} alt="" fill sizes="3rem" className="object-cover object-top" />
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-crimson-50 font-semibold text-crimson-700',
        box,
      )}
    >
      {initials}
    </span>
  );
}
