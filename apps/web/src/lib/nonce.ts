import 'server-only';
import { headers } from 'next/headers';

/** The CSP nonce created in proxy.ts, for the few scripts we add ourselves (e.g. Turnstile). */
export async function getNonce(): Promise<string | undefined> {
  return (await headers()).get('x-nonce') ?? undefined;
}
