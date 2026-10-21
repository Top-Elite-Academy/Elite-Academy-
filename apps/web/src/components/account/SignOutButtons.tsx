'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

const ENDPOINTS = {
  current: '/api/auth/logout',
  all: '/api/auth/logout-all',
} as const;

/** Ends the session on the server (spec §4.1), then returns to sign-in. */
export function SignOutButton({ scope }: { scope: keyof typeof ENDPOINTS }) {
  const t = useTranslations('Account');
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try {
      await apiRequest('POST', ENDPOINTS[scope]);
    } finally {
      router.replace(ROUTES.login);
      router.refresh();
    }
  };

  return (
    <Button
      variant={scope === 'all' ? 'secondary' : 'ghost'}
      className="whitespace-nowrap"
      disabled={busy}
      onClick={() => void signOut()}
    >
      {t(scope === 'all' ? 'signOutAll' : 'signOut')}
    </Button>
  );
}
