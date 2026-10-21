'use client';

import type { SlotInfo } from '@eta/shared';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';

type SlotsState =
  | { status: 'loading' }
  | { status: 'ready'; slots: SlotInfo[] }
  | { status: 'error'; code: string };

/** The mentor's free times for the service over the next 14 days (computed by the API). */
export function useFreeSlots(mentorId: string, service: string): SlotsState {
  const query = new URLSearchParams({ mentorId, service }).toString();
  // The answer remembers which question it belongs to: a new mentor or service shows "loading".
  const [result, setResult] = useState<{ query: string; state: SlotsState } | null>(null);

  useEffect(() => {
    let current = true;
    apiRequest<SlotInfo[]>('GET', `/api/booking/slots?${query}`)
      .then((slots) => {
        if (current) setResult({ query, state: { status: 'ready', slots } });
      })
      .catch((error: unknown) => {
        const code = error instanceof ApiError ? error.code : 'generic';
        if (current) setResult({ query, state: { status: 'error', code } });
      });
    return () => {
      current = false;
    };
  }, [query]);

  return result?.query === query ? result.state : { status: 'loading' };
}
