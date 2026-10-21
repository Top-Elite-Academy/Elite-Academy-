'use client';

import type { FaqItem, ProgramSummary } from '@eta/shared';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { CONTACT } from '@/config/site';
import { programPath, ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import type { BotReply, ChatMessage, Chip } from '@/lib/chat/assistant';
import { useCohortFormat } from '@/lib/format/use-cohort-format';
import { useMoney } from '@/lib/format/use-money';
import { cn } from '@/lib/cn';

export interface MentoringPrices {
  singleAgorot: number;
  planAgorot: number;
}

interface Content {
  programs: ProgramSummary[];
  faqs: FaqItem[];
  mentoringPrices: MentoringPrices | null;
}

/** One message. Screen readers hear who said it ("Assistant:", "You:"). */
export function ChatBubble({ message, content }: { message: ChatMessage; content: Content }) {
  const t = useTranslations('Chat');
  const chipLabel = useChipLabel();
  const isBot = message.from === 'bot';

  return (
    <li className={cn('flex', isBot ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isBot
            ? 'rounded-ss-sm border border-border bg-white text-ink'
            : 'rounded-se-sm bg-crimson-700 text-white',
        )}
      >
        <span className="sr-only">{`${isBot ? t('assistant') : t('you')}: `}</span>
        {message.from === 'bot' ? (
          <BotText reply={message} content={content} />
        ) : 'chip' in message ? (
          chipLabel(message.chip)
        ) : (
          message.text
        )}
      </div>
    </li>
  );
}

function BotText({ reply, content }: { reply: BotReply; content: Content }) {
  const t = useTranslations('Chat.bot');
  const money = useMoney();
  const dates = useCohortFormat();
  const byslug = (slug: string) => content.programs.find((p) => p.slug === slug);

  switch (reply.kind) {
    case 'text':
      return t(reply.key);
    case 'fit': {
      const found = reply.slugs.flatMap((slug) => byslug(slug) ?? []);
      if (found.length === 0) return t('fitNone');
      return (
        <>
          {t('fitResults', { count: found.length })}
          <LinkList items={found.map((p) => ({ href: programPath(p.slug), label: p.title }))} />
        </>
      );
    }
    case 'dates': {
      const found = reply.slugs.flatMap((slug) => byslug(slug) ?? []);
      if (found.length === 0) return t('noDates');
      return (
        <>
          {t('dates')}
          <LinkList
            items={found.map((p) => ({
              href: programPath(p.slug),
              label: p.title,
              note: p.nextCohortStart
                ? t('startsOn', { date: dates.dayMonth(p.nextCohortStart) })
                : null,
            }))}
          />
        </>
      );
    }
    case 'prices':
      return (
        <>
          {t('prices')}
          {content.mentoringPrices && (
            <p className="mt-2">
              {t('mentoringPrices', {
                single: money(content.mentoringPrices.singleAgorot),
                plan: money(content.mentoringPrices.planAgorot),
              })}
            </p>
          )}
        </>
      );
    case 'person':
      return (
        <>
          {t('person')}
          <span className="mt-3 flex flex-wrap gap-2">
            <ActionLink href={CONTACT.whatsappUrl} external>
              {t('whatsapp')}
            </ActionLink>
            <ActionLink href={ROUTES.enroll}>{t('callback')}</ActionLink>
          </span>
        </>
      );
    case 'mentoring':
      return (
        <>
          {t('mentoring')}
          <span className="mt-3 flex">
            <ActionLink href={ROUTES.mentoring}>{t('mentoringLink')}</ActionLink>
          </span>
        </>
      );
    case 'faq': {
      const faq = content.faqs.find((item) => item.key === reply.faqKey);
      return faq ? (
        <>
          <strong className="block">{faq.question}</strong>
          {faq.answer}
        </>
      ) : (
        t('notUnderstood')
      );
    }
  }
}

function LinkList({ items }: { items: { href: string; label: string; note?: string | null }[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="font-semibold text-crimson-700 underline">
            {item.label}
          </Link>
          {item.note && <span className="block text-xs text-ink-muted">{item.note}</span>}
        </li>
      ))}
    </ul>
  );
}

function ActionLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  const className =
    'inline-flex min-h-10 items-center rounded-full border border-crimson-700 px-3 text-sm font-semibold text-crimson-700 hover:bg-crimson-50';
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** The label of a suggested reply (also shown as the visitor's message once tapped). */
export function useChipLabel() {
  const t = useTranslations();
  return (chip: Chip): string => {
    switch (chip.kind) {
      case 'topic':
        return t(`Chat.chips.${chip.topic}`);
      case 'level':
        return t(`Levels.${chip.level}`);
      case 'subject':
        return chip.subject ? t(`Subjects.${chip.subject}`) : t('Chat.chips.notSure');
      case 'startOver':
        return t('Chat.chips.startOver');
    }
  };
}
