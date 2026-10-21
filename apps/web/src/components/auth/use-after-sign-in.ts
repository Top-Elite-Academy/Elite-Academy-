'use client';

import type { LoginResponse } from '@eta/shared';
import { useSearchParams } from 'next/navigation';
import { ROUTES } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { safeRedirectPath } from '@/lib/safe-redirect';

/** Moves the user to the next sign-in step, keeping the (validated) page they came from. */
export function useAfterSignIn() {
  const router = useRouter();
  const next = safeRedirectPath(useSearchParams().get('next'), ROUTES.account);
  const keepNext = `?next=${encodeURIComponent(next)}`;

  return (step: LoginResponse['next']) => {
    if (step === 'totp_setup') router.push(`${ROUTES.login}/setup${keepNext}`);
    else if (step === 'totp_verify') router.push(`${ROUTES.login}/verify${keepNext}`);
    else {
      router.replace(next);
      router.refresh();
    }
  };
}
