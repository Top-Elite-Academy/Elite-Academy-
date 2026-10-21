'use client';

import { type Locale, signupSchema } from '@eta/shared';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { Turnstile } from '@/components/forms/Turnstile';
import { useApiForm } from '@/components/forms/use-api-form';
import { ROUTES, withNext } from '@/config/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { safeRedirectPath } from '@/lib/safe-redirect';

/**
 * Student sign-up before paying (spec §3.7). The API makes the account a
 * student — the browser cannot choose a role — and signs the person in.
 */
export function SignupForm({ nonce }: { nonce: string | undefined }) {
  const t = useTranslations('Signup');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const nextParam = useSearchParams().get('next');
  const next = safeRedirectPath(nextParam, ROUTES.account);
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(signupSchema);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  // Turnstile tokens are single-use: a new key re-creates the widget after a failed attempt.
  const [captchaKey, setCaptchaKey] = useState(0);
  const onCaptchaToken = useCallback((token: string | undefined) => {
    setCaptchaToken(token);
  }, []);

  const submit = onSubmit(
    async (data) => {
      await apiRequest('POST', '/api/auth/signup', data);
      router.replace(next);
      router.refresh();
    },
    {
      extra: { locale, captchaToken },
      onError: () => {
        setCaptchaToken(undefined);
        setCaptchaKey((key) => key + 1);
      },
    },
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="firstName"
          label={t('firstName')}
          autoComplete="given-name"
          required
          error={fieldErrors['firstName']}
        />
        <TextField
          name="lastName"
          label={t('lastName')}
          autoComplete="family-name"
          required
          error={fieldErrors['lastName']}
        />
      </div>
      <TextField
        name="email"
        type="email"
        label={t('email')}
        autoComplete="email"
        required
        ltr
        error={fieldErrors['email']}
      />
      <TextField
        name="password"
        type="password"
        label={t('password')}
        hint={t('passwordHint')}
        autoComplete="new-password"
        required
        ltr
        error={fieldErrors['password']}
      />
      <Turnstile key={captchaKey} nonce={nonce} label={t('captcha')} onToken={onCaptchaToken} />
      <SubmitButton submitting={submitting}>{t('submit')}</SubmitButton>
      <Link
        href={nextParam ? withNext(ROUTES.login, next) : ROUTES.login}
        className="self-start text-sm font-semibold text-crimson-700 underline"
      >
        {t('haveAccount')}
      </Link>
    </form>
  );
}
