import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * The academy crest (public/brand/crest.png). Decorative wherever the academy
 * name is also written next to it, so the alt text is empty by default.
 */
export function Crest({
  size,
  alt = '',
  priority = false,
  className,
}: {
  size: number;
  alt?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/brand/crest.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 rounded-full', className)}
    />
  );
}
