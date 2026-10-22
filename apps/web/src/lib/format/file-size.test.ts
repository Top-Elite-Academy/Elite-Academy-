import { describe, expect, it } from 'vitest';
import { formatFileSize } from './file-size';

describe('formatFileSize', () => {
  it('picks a readable unit', () => {
    expect(formatFileSize(240 * 1024, 'en')).toBe('240 kB');
    expect(formatFileSize(3.2 * 1024 * 1024, 'en')).toBe('3.2 MB');
    expect(formatFileSize(1.6 * 1024 ** 3, 'en')).toBe('1.6 GB');
  });

  it('keeps Western digits in Arabic', () => {
    expect(formatFileSize(14 * 1024 * 1024, 'ar')).toMatch(/14/);
  });
});
