'use client';

import { passwordSchema } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { useApiForm } from '@/components/forms/use-api-form';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

const setPasswordFormSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    error: 'password.mismatch',
  });

const ENDPOINTS = {
  reset: '/api/auth/password/reset',
  invite: '/api/invitations/accept',
} as const;

/**
 * Sets a password from an emailed single-use link (reset or invitation).
 * The token is read from the URL fragment (#token=…), which browsers never send to servers.
 */
export function SetPasswordForm({ mode }: { mode: keyof typeof ENDPOINTS }) {
  const t = useTranslations();
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(setPasswordFormSchema);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The fragment exists only in the browser, so it can only be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser-only state
    setToken(new URLSearchParams(window.location.hash.slice(1)).get('token'));
    // Remove the token from the address bar and history.
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  if (token === undefined) return null;
  if (!token) {
    return (
      <div className="flex flex-col gap-5">
        <FormAlert tone="error">{t('ResetPassword.missingToken')}</FormAlert>
        <Link href="/forgot-password" className="text-sm font-semibold text-crimson-700 underline">
          {t('ResetPassword.requestNew')}
        </Link>
      </div>
    );
  }
  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <FormAlert tone="success">
          {t(mode === 'invite' ? 'Invite.done' : 'ResetPassword.done')}
        </FormAlert>
        <Link href={ROUTES.login} className="text-sm font-semibold text-crimson-700 underline">
          {t('ResetPassword.signIn')}
        </Link>
      </div>
    );
  }

  const submit = onSubmit(async (data) => {
    await apiRequest('POST', ENDPOINTS[mode], { token, password: data.password });
    setDone(true);
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <TextField
        name="password"
        type="password"
        label={t('ResetPassword.password')}
        hint={t('ResetPassword.hint')}
        autoComplete="new-password"
        required
        ltr
        error={fieldErrors['password']}
      />
      <TextField
        name="confirm"
        type="password"
        label={t('ResetPassword.confirm')}
        autoComplete="new-password"
        required
        ltr
        error={fieldErrors['confirm']}
      />
      <SubmitButton submitting={submitting}>
        {t(mode === 'invite' ? 'Invite.submit' : 'ResetPassword.submit')}
      </SubmitButton>
    </form>
  );
}
