'use client';

import { useSyncExternalStore } from 'react';
import {
  A11Y_COOKIE,
  A11Y_COOKIE_MAX_AGE,
  type A11yPrefs,
  applyPrefs,
  DEFAULT_PREFS,
  parsePrefs,
  serializePrefs,
} from './preferences';

let current: A11yPrefs | null = null;
const listeners = new Set<() => void>();

function read(): A11yPrefs {
  current ??= parsePrefs(
    document.cookie
      .split('; ')
      .find((part) => part.startsWith(`${A11Y_COOKIE}=`))
      ?.slice(A11Y_COOKIE.length + 1),
  );
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Saves a change on this device and applies it to the page at once. Merges into the
 * latest settings (not a rendered copy), so quick clicks never undo each other.
 */
export function updateA11yPrefs(change: Partial<A11yPrefs>): void {
  const prefs = { ...read(), ...change };
  current = prefs;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${A11Y_COOKIE}=${serializePrefs(prefs)}; Path=/; Max-Age=${A11Y_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  applyPrefs(document.documentElement, prefs);
  for (const listener of listeners) listener();
}

/** The visitor's accessibility settings (defaults while rendering on the server). */
export function useA11yPrefs(): A11yPrefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
}
