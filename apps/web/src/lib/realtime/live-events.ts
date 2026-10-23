'use client';

import type { MessageEvent as NewMessageEvent, NotificationView } from '@eta/shared';
import { useEffect, useRef } from 'react';

/** What each kind of live event carries. */
interface LiveEvents {
  notification: { kind: 'notification'; notification: NotificationView };
  message: NewMessageEvent;
}

type Handler = (event: Record<string, unknown>) => void;

/**
 * One Server-Sent Events connection per tab, shared by every part of the
 * page that wants live updates (the bell, message badges, open threads).
 * Each event carries a "kind"; subscribers get only their kind.
 */
const handlers = new Map<string, Set<Handler>>();
let source: EventSource | null = null;

function connect() {
  // The browser reconnects by itself if the connection drops.
  source = new EventSource('/api/notifications/stream');
  source.onmessage = (message: MessageEvent<string>) => {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(message.data) as Record<string, unknown>;
    } catch {
      return;
    }
    const kind = typeof event['kind'] === 'string' ? event['kind'] : '';
    handlers.get(kind)?.forEach((handler) => {
      handler(event);
    });
  };
}

function subscribe(kind: string, handler: Handler): () => void {
  const set = handlers.get(kind) ?? new Set<Handler>();
  set.add(handler);
  handlers.set(kind, set);
  if (!source) connect();
  return () => {
    set.delete(handler);
    if ([...handlers.values()].every((group) => group.size === 0)) {
      source?.close();
      source = null;
    }
  };
}

/** Calls `handler` for every live event of this kind while the component is on screen. */
export function useLiveEvent<K extends keyof LiveEvents>(
  kind: K,
  handler: (event: LiveEvents[K]) => void,
) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(
    () =>
      subscribe(kind, (event) => {
        latest.current(event as unknown as LiveEvents[K]);
      }),
    [kind],
  );
}
