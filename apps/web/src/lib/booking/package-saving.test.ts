import type { PackageInfo } from '@eta/shared';
import { describe, expect, it } from 'vitest';
import { packageSaving } from './package-saving';

const pkg = (code: string, sessions: number, priceAgorot: number): PackageInfo => ({
  code,
  kind: code.startsWith('career') ? 'career' : 'instructor',
  sessions,
  priceAgorot,
  sessionMinutes: 60,
  recommended: false,
});
const PACKAGES = [
  pkg('mentoring-1', 1, 36_000),
  pkg('mentoring-4', 4, 135_000),
  pkg('mentoring-8', 8, 250_000),
  pkg('career-cv', 1, 25_000),
];

describe('packageSaving', () => {
  it('compares a package with the same number of single sessions', () => {
    expect(packageSaving(PACKAGES[2]!, PACKAGES)).toEqual({
      fullAgorot: 288_000,
      savedAgorot: 38_000,
    });
    expect(packageSaving(PACKAGES[1]!, PACKAGES)).toEqual({
      fullAgorot: 144_000,
      savedAgorot: 9_000,
    });
  });

  it('has no sale for single sessions, missing singles or packages that cost more', () => {
    expect(packageSaving(PACKAGES[0]!, PACKAGES)).toBeNull();
    expect(packageSaving(PACKAGES[2]!, PACKAGES.slice(1))).toBeNull();
    expect(packageSaving(pkg('mentoring-4', 4, 150_000), PACKAGES)).toBeNull();
  });
});
