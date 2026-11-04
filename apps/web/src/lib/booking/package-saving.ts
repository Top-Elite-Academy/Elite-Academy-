import type { PackageInfo } from '@eta/shared';

export interface PackageSaving {
  /** What the same sessions cost one by one. */
  fullAgorot: number;
  savedAgorot: number;
}

/**
 * The sale on a multi-session package: its price against buying the same
 * number of single sessions of the same kind. Null when there is nothing to
 * compare with or the package saves nothing.
 */
export function packageSaving(pkg: PackageInfo, packages: PackageInfo[]): PackageSaving | null {
  if (pkg.sessions < 2) return null;
  const single = packages.find((other) => other.kind === pkg.kind && other.sessions === 1);
  if (!single) return null;
  const fullAgorot = single.priceAgorot * pkg.sessions;
  const savedAgorot = fullAgorot - pkg.priceAgorot;
  return savedAgorot > 0 ? { fullAgorot, savedAgorot } : null;
}
