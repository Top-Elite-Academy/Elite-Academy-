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

/**
 * Saved in a cookie on this device so the server can render the page with the
 * settings already applied: no flash of the default style, no inline script,
 * and it works without JavaScript. A preference only — nothing personal.
 */
export const A11Y_COOKIE = 'eta_a11y';
export const A11Y_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cookie value: only the settings that differ from the default, as URL-encoded JSON. */
export function serializePrefs(prefs: A11yPrefs): string {
  const changed = Object.fromEntries(
    Object.entries(prefs).filter(([key, value]) => DEFAULT_PREFS[key as keyof A11yPrefs] !== value),
  );
  return encodeURIComponent(JSON.stringify(changed));
}

/** Reads saved settings; anything unexpected falls back to the default. */
export function parsePrefs(raw: string | null | undefined): A11yPrefs {
  let saved: Record<string, unknown> = {};
  try {
    const value: unknown = raw ? JSON.parse(decodeURIComponent(raw)) : {};
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

/** The data-a11y-* attributes for <html>; globals.css styles them. */
export function prefsAttributes(prefs: A11yPrefs): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (prefs.textSize !== 'normal') attributes['data-a11y-text'] = prefs.textSize;
  for (const key of A11Y_TOGGLES) if (prefs[key]) attributes[`data-a11y-${key}`] = '';
  return attributes;
}

/** Applies settings to the live page (same attributes the server renders). */
export function applyPrefs(root: HTMLElement, prefs: A11yPrefs): void {
  const wanted = prefsAttributes(prefs);
  for (const name of root.getAttributeNames()) {
    if (name.startsWith('data-a11y-') && !(name in wanted)) root.removeAttribute(name);
  }
  for (const [name, value] of Object.entries(wanted)) root.setAttribute(name, value);
}
