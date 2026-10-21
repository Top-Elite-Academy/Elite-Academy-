import { describe, expect, it } from 'vitest';
import ar from '../../messages/ar.json';
import en from '../../messages/en.json';
import he from '../../messages/he.json';

/** Every key path in a messages object, e.g. "Nav.courses". */
function keysOf(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keysOf(value as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function placeholdersOf(messages: object): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const walk = (node: object, prefix: string) => {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string') result[prefix + key] = (value.match(/\{\w+\}/g) ?? []).sort();
      else if (typeof value === 'object' && value !== null)
        walk(value as object, `${prefix}${key}.`);
    }
  };
  walk(messages, '');
  return result;
}

describe('translations', () => {
  it.each([
    ['ar', ar],
    ['he', he],
  ])('%s has exactly the same keys as en', (_locale, messages) => {
    expect(keysOf(messages).sort()).toEqual(keysOf(en).sort());
  });

  it.each([
    ['ar', ar],
    ['he', he],
  ])('%s uses the same {placeholders} as en', (_locale, messages) => {
    expect(placeholdersOf(messages)).toEqual(placeholdersOf(en));
  });

  it('has no empty strings', () => {
    for (const messages of [en, ar, he]) {
      const empty = keysOf(messages).filter((path) => {
        const value = path
          .split('.')
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], messages);
        return value === '';
      });
      expect(empty).toEqual([]);
    }
  });
});
