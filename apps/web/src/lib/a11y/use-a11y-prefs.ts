'use client';

import { useSyncExternalStore } from 'react';
import {
  A11Y_STORAGE_KEY,
  type A11yPrefs,
  applyPrefs,
  DEFAULT_PREFS,
  parsePrefs,
} from './preferences';

let current: A11yPrefs | null = null;
const listeners = new Set<() => void>();

function read(): A11yPrefs {
  if (!current) {
    try {
      current = parsePrefs(localStorage.getItem(A11Y_STORAGE_KEY));
    } catch {
      // Storage blocked (private mode, site data off): settings still work for this page.
      current = DEFAULT_PREFS;
    }
  }
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
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // See read(): not saved, but applied.
  }
  applyPrefs(document.documentElement, prefs);
  for (const listener of listeners) listener();
}

/** The visitor's accessibility settings (defaults while rendering on the server). */
export function useA11yPrefs(): A11yPrefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
}
