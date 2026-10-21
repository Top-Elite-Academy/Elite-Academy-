import type { MentorKind } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { BriefcaseIcon, UsersIcon } from '@/components/ui/icons';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

/**
 * The two services as large option cards (spec §3.5). Each is a link (?tab=…),
 * so the header's "Mentoring" and "Career advice" open the right one and the
 * choice can be shared.
 */
export function ServiceCards({
  selected,
  mentoringPrice,
  careerPrice,
}: {
  selected: MentorKind;
  /** Already formatted, e.g. "₪250"; null hides the price. */
  mentoringPrice: string | null;
  careerPrice: string | null;
}) {
  const t = useTranslations('Mentoring.services');
  const cards = [
    {
      kind: 'instructor' as const,
      key: 'mentoring' as const,
      href: ROUTES.mentoring,
      price: mentoringPrice,
      badge: (
        <Badge tone="sage" icon={<UsersIcon className="size-3.5" />}>
          {t('mentoring.badge')}
        </Badge>
      ),
    },
    {
      kind: 'career' as const,
      key: 'career' as const,
      href: ROUTES.careerAdvice,
      price: careerPrice,
      badge: (
        <Badge tone="slate" icon={<BriefcaseIcon className="size-3.5" />}>
          {t('career.badge')}
        </Badge>
      ),
    },
  ];

  return (
    <nav aria-label={t('label')}>
      <ul className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const current = card.kind === selected;
          return (
            <li key={card.key} className="flex">
              <Link
                href={card.href}
                scroll={false}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col rounded-[var(--radius-card)] border bg-white p-5 transition-shadow hover:shadow-md',
                  current ? 'border-2 border-crimson-700 shadow-md' : 'border-border',
                )}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  {card.badge}
                  {card.price && (
                    <span className="text-sm text-ink-muted">
                      {t(`${card.key}.price`, { price: card.price })}
                    </span>
                  )}
                </span>
                <span className="mt-3 text-lg font-semibold text-ink">
                  {t(`${card.key}.title`)}
                </span>
                <span className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {t(`${card.key}.body`)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
