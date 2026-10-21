import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it.each(['/app', '/app/courses?tab=done', '/'])('allows the internal path %s', (path) => {
    expect(safeRedirectPath(path, '/fallback')).toBe(path);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'app',
    '/app\nSet-Cookie: x',
    '',
    null,
    undefined,
  ])('rejects %s', (target) => {
    expect(safeRedirectPath(target, '/fallback')).toBe('/fallback');
  });
});
