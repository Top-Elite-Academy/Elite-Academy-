import type { FaqItem } from '@eta/shared';
import { PlusIcon } from './icons';

/**
 * Accordion of questions. Native <details> elements sharing one `name`: the
 * browser keeps one open at a time, with keyboard support and no JavaScript.
 */
export function FaqList({ items, name }: { items: FaqItem[]; name: string }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details
          key={item.key}
          name={name}
          className="group rounded-[var(--radius-control)] border border-border bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {item.question}
            <PlusIcon className="size-5 text-crimson-700 transition-transform group-open:rotate-45" />
          </summary>
          <p className="px-5 pb-5 leading-relaxed text-ink-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
