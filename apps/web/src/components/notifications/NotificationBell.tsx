'use client';

import type { NotificationsResponse, NotificationView } from '@eta/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { BellIcon } from '@/components/ui/icons';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { useLiveEvent } from '@/lib/realtime/live-events';
import { useNotificationText } from './use-notification-text';

const KEEP = 20;

/**
 * Notification bell (spec §4.2 top bar). Loads the latest notifications, then
 * listens to the live stream (Server-Sent Events): a new announcement shows up
 * at once and is read out by screen readers.
 */
export function NotificationBell() {
  const t = useTranslations('Notifications');
  const format = useFormatter();
  const { text, href } = useNotificationText();
  const [data, setData] = useState<NotificationsResponse>({ items: [], unread: 0 });
  const [latest, setLatest] = useState<NotificationView | null>(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    apiRequest<NotificationsResponse>('GET', '/api/notifications')
      .then((loaded) => {
        if (active) setData(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useLiveEvent('notification', ({ notification }) => {
    setData((previous) => ({
      items: [notification, ...previous.items].slice(0, KEEP),
      unread: previous.unread + 1,
    }));
    setLatest(notification);
  });

  // Close when clicking outside or pressing Escape; focus returns to the bell.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    await apiRequest('POST', '/api/notifications/read', {}).catch(() => undefined);
    const now = new Date().toISOString();
    setData((previous) => ({
      items: previous.items.map((item) => ({ ...item, readAt: item.readAt ?? now })),
      unread: 0,
    }));
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="relative inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-sand"
      >
        <BellIcon className="size-6" />
        <span className="sr-only">{`${t('label')}, ${t('unread', { count: data.unread })}`}</span>
        {data.unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute end-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-crimson-700 px-1 text-xs font-bold text-white"
          >
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>

      {/* Read out new notifications that arrive while the page is open. */}
      <p role="status" className="sr-only">
        {latest ? t('live', { text: text(latest) }) : ''}
      </p>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={t('label')}
          className="absolute end-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-[var(--radius-card)] border border-border bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="font-semibold text-ink">{t('label')}</h2>
            {data.unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="rounded-sm text-sm font-semibold text-crimson-700 underline"
              >
                {t('markAll')}
              </button>
            )}
          </div>
          {data.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">{t('empty')}</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {data.items.map((item) => (
                <li key={item.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={href(item)}
                    onClick={() => {
                      setOpen(false);
                    }}
                    className={cn(
                      'flex gap-3 px-4 py-3 text-sm hover:bg-cream',
                      !item.readAt && 'bg-crimson-50/60',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        item.readAt ? 'bg-transparent' : 'bg-crimson-700',
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-ink">{text(item)}</span>
                      <span className="block text-xs text-ink-muted">
                        {format.relativeTime(new Date(item.createdAt))}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
