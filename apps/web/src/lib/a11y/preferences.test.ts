import { describe, expect, it } from 'vitest';
import {
  A11Y_BOOT_SCRIPT,
  A11Y_STORAGE_KEY,
  type A11yPrefs,
  applyPrefs,
  DEFAULT_PREFS,
  parsePrefs,
} from './preferences';

/** Just enough of an element to record attributes (no DOM library needed). */
function fakeElement() {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    toggleAttribute: (name: string, force: boolean) => {
      if (force) attributes.set(name, '');
      else attributes.delete(name);
      return force;
    },
  };
}

/** Runs the <head> script with a fake localStorage and document. */
function runBootScript(prefs: A11yPrefs) {
  const root = fakeElement();
  const storage = {
    getItem: (key: string) => (key === A11Y_STORAGE_KEY ? JSON.stringify(prefs) : null),
  };
  // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval -- runs our own constant, as the page does
  new Function('localStorage', 'document', A11Y_BOOT_SCRIPT)(storage, { documentElement: root });
  return root.attributes;
}

describe('parsePrefs', () => {
  it('keeps valid settings and ignores anything else', () => {
    expect(parsePrefs(JSON.stringify({ textSize: 'large', contrast: true, links: 'yes' }))).toEqual(
      {
        ...DEFAULT_PREFS,
        textSize: 'large',
        contrast: true,
      },
    );
    expect(parsePrefs(JSON.stringify({ textSize: 'huge' }))).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{not json')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
  });
});

describe('applyPrefs and the boot script', () => {
  it('set the same attributes, so the page never flashes the default style', () => {
    const prefs: A11yPrefs = { ...DEFAULT_PREFS, textSize: 'larger', motion: true, font: true };
    const applied = fakeElement();
    applyPrefs(applied as unknown as HTMLElement, prefs);

    expect(Object.fromEntries(runBootScript(prefs))).toEqual(
      Object.fromEntries(applied.attributes),
    );
    expect(applied.attributes.get('data-a11y-text')).toBe('larger');
  });

  it('removes everything when reset', () => {
    const root = fakeElement();
    applyPrefs(root as unknown as HTMLElement, {
      ...DEFAULT_PREFS,
      textSize: 'large',
      links: true,
    });
    applyPrefs(root as unknown as HTMLElement, DEFAULT_PREFS);
    expect(root.attributes.size).toBe(0);
  });
});
