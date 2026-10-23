'use client';

import { useRouter } from '@/i18n/navigation';
import { useLiveEvent } from '@/lib/realtime/live-events';

/** Reloads the inbox when a new message arrives in any of the user's threads. */
export function LiveRefresh() {
  const router = useRouter();
  useLiveEvent('message', () => {
    router.refresh();
  });
  return null;
}
