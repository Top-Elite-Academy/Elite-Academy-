'use client';

import { loginSchema, type LoginResponse } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { Turnstile } from '@/components/forms/Turnstile';
import { useApiForm } from '@/components/forms/use-api-form';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useAfterSignIn } from './use-after-sign-in';

/** Email + password. A captcha appears after repeated failures (spec §9.1). */
export function LoginForm({ nonce }: { nonce: string | undefined }) {
  const t = useTranslations('Login');
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(loginSchema);
  const afterSignIn = useAfterSignIn();
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const onCaptchaToken = useCallback((token: string | undefined) => {
    setCaptchaToken(token);
  }, []);

  const submit = onSubmit(
    async (data) => {
      const result = await apiRequest<LoginResponse>('POST', '/api/auth/login', data);
      afterSignIn(result.next);
    },
    {
      extra: { captchaToken },
      onError: (error) => {
        if (error.captchaRequired) setCaptchaRequired(true);
      },
    },
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <TextField
        name="email"
        type="email"
        label={t('email')}
        autoComplete="username"
        required
        ltr
        error={fieldErrors['email']}
      />
      <TextField
        name="password"
        type="password"
        label={t('password')}
        autoComplete="current-password"
        required
        ltr
        error={fieldErrors['password']}
      />
      {captchaRequired && <Turnstile nonce={nonce} label={t('captcha')} onToken={onCaptchaToken} />}
      <SubmitButton submitting={submitting}>{t('submit')}</SubmitButton>
      <Link
        href="/forgot-password"
        className="self-start text-sm font-semibold text-crimson-700 underline"
      >
        {t('forgot')}
      </Link>
    </form>
  );
}
