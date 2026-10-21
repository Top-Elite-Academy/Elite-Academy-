import { useFormatter } from 'next-intl';

type Formatter = ReturnType<typeof useFormatter>;

/** Shekel amount from integer agorot (₪250 = 25000), in the page language with Western digits. */
export function formatShekels(format: Formatter, agorot: number): string {
  return format.number(agorot / 100, {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: agorot % 100 === 0 ? 0 : 2,
    numberingSystem: 'latn',
  });
}

/** Same, as a hook for components. */
export function useMoney() {
  const format = useFormatter();
  return (agorot: number) => formatShekels(format, agorot);
}
