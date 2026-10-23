import {
  type ConversationList as ConversationListData,
  conversationFilterSchema,
  type ConversationThread,
  type Recipient,
} from '@eta/shared';
import { getTranslations } from 'next-intl/server';
import { PillNav } from '@/components/ui/PillNav';
import { messagesPath } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { isBookingId } from '@/lib/booking/booking-state';
import { ConversationList } from './ConversationList';
import { LiveRefresh } from './LiveRefresh';
import { NewMessageDialog } from './NewMessageDialog';
import { SearchThreads } from './SearchThreads';
import { ThreadView } from './ThreadView';

type Query = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => (typeof value === 'string' ? value : '');

/**
 * Messages & support (spec §4.9) for any area: thread list with All / Unread
 * and search on one side, the open thread on the other.
 */
export async function MessagesScreen({
  base,
  query,
  intro,
  teamInbox = false,
}: {
  /** The page the inbox lives on, e.g. /app/messages */
  base: string;
  query: Query;
  intro?: string;
  teamInbox?: boolean;
}) {
  const { filter, q } = conversationFilterSchema
    .catch({ filter: 'all', q: '' })
    .parse({ filter: single(query['filter']) || undefined, q: single(query['q']) });
  const threadId = single(query['thread']);
  const search = new URLSearchParams({ filter, q }).toString();
  const [list, thread, recipients, t] = await Promise.all([
    getAsUser<ConversationListData>(`/api/messages/conversations?${search}`),
    isBookingId(threadId)
      ? getAsUser<ConversationThread>(`/api/messages/conversations/${threadId}`).catch(() => null)
      : Promise.resolve(null),
    getAsUser<Recipient[]>('/api/messages/recipients'),
    getTranslations('Messages'),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
          {intro && <p className="mt-1 text-sm text-ink-muted">{intro}</p>}
        </div>
        <NewMessageDialog base={base} recipients={recipients} initialTo={single(query['to'])} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-3">
          <PillNav
            label={t('filterLabel')}
            items={(['all', 'unread'] as const).map((value) => ({
              key: value,
              href: messagesPath(base, { filter: value === 'all' ? '' : value, q }),
              label:
                value === 'all' ? t('filters.all') : t('filters.unread', { count: list.unread }),
              current: value === filter,
            }))}
          />
          <SearchThreads base={base} filter={filter} q={q} />
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-sm">
            <ConversationList
              base={base}
              items={list.items}
              selectedId={thread?.id ?? null}
              filter={filter}
              q={q}
              teamInbox={teamInbox}
            />
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm sm:p-6">
          {thread ? (
            <ThreadView key={thread.id} thread={thread} />
          ) : (
            <p className="text-ink-muted">{t('pick')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
