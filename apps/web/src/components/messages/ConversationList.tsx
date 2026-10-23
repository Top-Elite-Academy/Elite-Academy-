import type { ConversationSummary } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { messagesPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { useCounterpartName } from './use-counterpart-name';

/** The thread list (spec §4.9 left pane): newest first, unread ones marked. */
export function ConversationList({
  base,
  items,
  selectedId,
  filter,
  q,
  teamInbox,
}: {
  base: string;
  items: ConversationSummary[];
  selectedId: string | null;
  filter: string;
  q: string;
  /** Team inboxes also say which team the thread is for. */
  teamInbox: boolean;
}) {
  const t = useTranslations('Messages');
  if (items.length === 0) return <p className="p-5 text-sm text-ink-muted">{t('noThreads')}</p>;

  return (
    <nav aria-label={t('threads')}>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={messagesPath(base, {
                thread: item.id,
                filter: filter === 'all' ? '' : filter,
                q,
              })}
              aria-current={item.id === selectedId ? 'page' : undefined}
              className={cn(
                'flex flex-col gap-1 px-4 py-3 text-sm hover:bg-cream',
                item.id === selectedId && 'bg-sand',
              )}
            >
              <ThreadRow item={item} teamInbox={teamInbox} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ThreadRow({ item, teamInbox }: { item: ConversationSummary; teamInbox: boolean }) {
  const t = useTranslations('Messages');
  const when = useBookingFormat();
  const name = useCounterpartName();
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className={cn('text-ink', item.unread > 0 && 'font-semibold')}>
          {name(item.counterpart)}
          {teamInbox && item.kind !== 'direct' && (
            <span className="text-ink-muted"> · {t(`teams.${item.kind}`)}</span>
          )}
        </span>
        {item.unread > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-crimson-700">
            <span aria-hidden="true" className="size-2 rounded-full bg-crimson-700" />
            {t('unread', { count: item.unread })}
          </span>
        )}
      </span>
      {item.subject && <span className="text-ink">{item.subject}</span>}
      {item.lastMessage && (
        <span className="line-clamp-1 text-ink-muted">
          {item.lastMessage.fromMe ? `${t('you')} ` : ''}
          {item.lastMessage.body || t('attachmentOnly')}
        </span>
      )}
      {item.lastMessage && (
        <span className="text-xs text-ink-muted">{when.dayTime(item.lastMessage.createdAt)}</span>
      )}
    </>
  );
}
