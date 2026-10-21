import { describe, expect, it } from 'vitest';
import {
  type A11yPrefs,
  applyPrefs,
  DEFAULT_PREFS,
  parsePrefs,
  prefsAttributes,
  serializePrefs,
} from './preferences';

/** Just enough of an element to record attributes (no DOM library needed). */
function fakeElement() {
  const attributes = new Map<string, string>();
  const element = {
    getAttributeNames: () => [...attributes.keys()],
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
  };
  return { attributes, root: element as unknown as HTMLElement };
}

describe('cookie value', () => {
  it('round-trips, storing only what differs from the default', () => {
    const prefs: A11yPrefs = { ...DEFAULT_PREFS, textSize: 'large', contrast: true };
    expect(decodeURIComponent(serializePrefs(prefs))).toBe('{"textSize":"large","contrast":true}');
    expect(parsePrefs(serializePrefs(prefs))).toEqual(prefs);
  });

  it('ignores anything unexpected', () => {
    expect(parsePrefs(encodeURIComponent('{"textSize":"huge","links":"yes"}'))).toEqual(
      DEFAULT_PREFS,
    );
    expect(parsePrefs('%7Bnot json')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('%E0%A4%A')).toEqual(DEFAULT_PREFS); // broken encoding
    expect(parsePrefs(undefined)).toEqual(DEFAULT_PREFS);
  });
});

describe('attributes', () => {
  it('the live page gets exactly what the server renders, and reset removes it all', () => {
    const prefs: A11yPrefs = { ...DEFAULT_PREFS, textSize: 'larger', motion: true, font: true };
    expect(prefsAttributes(prefs)).toEqual({
      'data-a11y-text': 'larger',
      'data-a11y-font': '',
      'data-a11y-motion': '',
    });

    const { attributes, root } = fakeElement();
    attributes.set('lang', 'en');
    applyPrefs(root, prefs);
    expect(Object.fromEntries(attributes)).toEqual({ lang: 'en', ...prefsAttributes(prefs) });

    applyPrefs(root, DEFAULT_PREFS);
    expect(Object.fromEntries(attributes)).toEqual({ lang: 'en' });
  });
});
