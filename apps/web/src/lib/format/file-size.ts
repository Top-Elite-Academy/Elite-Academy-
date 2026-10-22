const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;

/** "3.2 MB", "1.6 GB" in the page language (Western digits). */
export function formatFileSize(bytes: number, locale: string): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[unit],
    unitDisplay: 'short',
    maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0,
    numberingSystem: 'latn',
  }).format(value);
}
