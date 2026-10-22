import type { AnnouncementView } from '@eta/shared';
import { useFormatter, useTranslations } from 'next-intl';

/** Announcements, newest first. Text is shown as plain text (never as HTML). */
export function AnnouncementList({
  items,
  emptyText,
}: {
  items: AnnouncementView[];
  emptyText: string;
}) {
  const t = useTranslations('Teach.announcements');
  const format = useFormatter();
  if (items.length === 0) return <p className="text-ink-muted">{emptyText}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="py-3 first:pt-0 last:pb-0">
          <h3 className="font-semibold text-ink">{item.title}</h3>
          <p className="mt-1 text-sm whitespace-pre-line text-ink">{item.body}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {t('by', {
              name: item.authorName,
              date: format.dateTime(new Date(item.createdAt), {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
                timeZone: 'Asia/Jerusalem',
                numberingSystem: 'latn',
              }),
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}
