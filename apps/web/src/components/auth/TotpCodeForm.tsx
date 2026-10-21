'use client';

import { type LoginResponse, totpVerifySchema } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { useApiForm } from '@/components/forms/use-api-form';
import { ROUTES } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useAfterSignIn } from './use-after-sign-in';

/** The 6-digit code field, used both to confirm enrolment and to sign in. */
export function TotpCodeForm({
  endpoint,
}: {
  endpoint: '/api/auth/2fa/enable' | '/api/auth/2fa/verify';
}) {
  const t = useTranslations('TwoFactor');
  const router = useRouter();
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(totpVerifySchema);
  const afterSignIn = useAfterSignIn();

  const submit = onSubmit(
    async (data) => {
      const result = await apiRequest<LoginResponse>('POST', endpoint, data);
      afterSignIn(result.next);
    },
    {
      onError: (error) => {
        // The pending session is gone (too many attempts or expired): start again.
        if (error.status === 401) router.replace(ROUTES.login);
      },
    },
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <TextField
        name="code"
        label={t('code')}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        ltr
        error={fieldErrors['code']}
      />
      <SubmitButton submitting={submitting}>{t('submit')}</SubmitButton>
    </form>
  );
}
