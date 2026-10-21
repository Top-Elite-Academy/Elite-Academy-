import 'server-only';
import { cookies } from 'next/headers';
import { A11Y_COOKIE, type A11yPrefs, parsePrefs } from './preferences';

/** The visitor's accessibility settings, from their cookie, for the first render. */
export async function getA11yPrefs(): Promise<A11yPrefs> {
  return parsePrefs((await cookies()).get(A11Y_COOKIE)?.value);
}
