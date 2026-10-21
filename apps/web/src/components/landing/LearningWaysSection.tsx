import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { ArrowForwardIcon, BriefcaseIcon, LiveIcon, UsersIcon } from '@/components/ui/icons';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';

interface Way {
  key: 'live' | 'mentoring' | 'career';
  href: string;
  tone: BadgeTone;
  icon: ReactNode;
}

const WAYS: Way[] = [
  { key: 'live', href: ROUTES.courses, tone: 'gold', icon: <LiveIcon className="size-3.5" /> },
  {
    key: 'mentoring',
    href: ROUTES.mentoring,
    tone: 'sage',
    icon: <UsersIcon className="size-3.5" />,
  },
  {
    key: 'career',
    href: ROUTES.careerAdvice,
    tone: 'slate',
    icon: <BriefcaseIcon className="size-3.5" />,
  },
];

/** Spec §3.1.3 — live courses, teacher mentoring, career advice. */
export function LearningWaysSection() {
  const t = useTranslations('Landing.ways');

  return (
    <section aria-labelledby="ways-title" className="bg-sand py-20">
      <Container>
        <SectionHeading id="ways-title" title={t('title')} description={t('description')} />
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {WAYS.map((way) => (
            <li
              key={way.key}
              className="flex flex-col rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-sm"
            >
              <div>
                <Badge tone={way.tone} icon={way.icon}>
                  {t(`${way.key}.badge`)}
                </Badge>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{t(`${way.key}.title`)}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                {t(`${way.key}.body`)}
              </p>
              <Link
                href={way.href}
                className="mt-5 inline-flex items-center gap-2 self-start rounded-sm font-semibold text-crimson-700 hover:underline"
              >
                {t(`${way.key}.cta`)}
                <ArrowForwardIcon className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
