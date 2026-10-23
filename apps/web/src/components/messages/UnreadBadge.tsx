'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useLiveEvent } from '@/lib/realtime/live-events';

/** Threads with unread messages, next to "Messages" in the navigation (spec §4.2). */
export function UnreadBadge() {
  const t = useTranslations('Messages');
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [version, setVersion] = useState(0);

  // Reload on page changes (opening a thread reads it) and on new messages.
  useEffect(() => {
    let active = true;
    apiRequest<{ unread: number }>('GET', '/api/messages/unread')
      .then((result) => {
        if (active) setCount(result.unread);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pathname, version]);
  useLiveEvent('message', () => {
    setVersion((value) => value + 1);
  });

  if (count === 0) return null;
  return (
    <span className="ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-crimson-700 px-1.5 text-xs font-semibold text-white">
      {count}
      <span className="sr-only">{t('unreadBadge', { count })}</span>
    </span>
  );
}
