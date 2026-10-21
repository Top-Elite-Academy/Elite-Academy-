/**
 * Accessibility settings a visitor can choose (IS 5568 accessibility menu).
 * Each one is a data attribute on <html>; globals.css does the rest, so the
 * settings work on every page without changing any component.
 */
export const TEXT_SIZES = ['normal', 'large', 'larger'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const A11Y_TOGGLES = ['contrast', 'links', 'font', 'motion', 'spacing'] as const;
export type A11yToggle = (typeof A11Y_TOGGLES)[number];

export type A11yPrefs = { textSize: TextSize } & Record<A11yToggle, boolean>;

export const DEFAULT_PREFS: A11yPrefs = {
  textSize: 'normal',
  contrast: false,
  links: false,
  font: false,
  motion: false,
  spacing: false,
};

/** Kept in this browser only: a per-visitor convenience, nothing is sent to the server. */
export const A11Y_STORAGE_KEY = 'eta-a11y';

/** Reads saved settings; anything unexpected falls back to the default. */
export function parsePrefs(raw: string | null): A11yPrefs {
  let saved: Record<string, unknown> = {};
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (value && typeof value === 'object') saved = value as Record<string, unknown>;
  } catch {
    // Corrupt value: ignore it.
  }
  const prefs: A11yPrefs = { ...DEFAULT_PREFS };
  if (TEXT_SIZES.includes(saved['textSize'] as TextSize))
    prefs.textSize = saved['textSize'] as TextSize;
  for (const key of A11Y_TOGGLES) prefs[key] = saved[key] === true;
  return prefs;
}

/** Sets or removes the data-a11y-* attributes on the root element. */
export function applyPrefs(root: HTMLElement, prefs: A11yPrefs): void {
  if (prefs.textSize === 'normal') root.removeAttribute('data-a11y-text');
  else root.setAttribute('data-a11y-text', prefs.textSize);
  for (const key of A11Y_TOGGLES) root.toggleAttribute(`data-a11y-${key}`, prefs[key]);
}

/**
 * Runs in <head> before the page paints, so a visitor who chose large text or
 * high contrast never sees the page flash in the default style. Mirrors
 * parsePrefs + applyPrefs in plain ES5.
 */
export const A11Y_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  A11Y_STORAGE_KEY,
)})||'{}'),d=document.documentElement;if(${JSON.stringify(TEXT_SIZES.slice(1))}.indexOf(p.textSize)>-1)d.setAttribute('data-a11y-text',p.textSize);${JSON.stringify(
  A11Y_TOGGLES,
)}.forEach(function(k){if(p[k]===true)d.setAttribute('data-a11y-'+k,'')})}catch(e){}`;
