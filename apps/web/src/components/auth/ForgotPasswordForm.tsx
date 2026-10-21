'use client';

import { forgotPasswordSchema } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { useApiForm } from '@/components/forms/use-api-form';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/** Always shows the same confirmation, so it never reveals whether an email has an account. */
export function ForgotPasswordForm() {
  const t = useTranslations('ForgotPassword');
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(forgotPasswordSchema);
  const [sent, setSent] = useState(false);

  const submit = onSubmit(async (data) => {
    await apiRequest('POST', '/api/auth/password/forgot', data);
    setSent(true);
  });

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <FormAlert tone="success">{t('sent')}</FormAlert>
        <Link href={ROUTES.login} className="text-sm font-semibold text-crimson-700 underline">
          {t('backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <TextField
        name="email"
        type="email"
        label={t('email')}
        autoComplete="email"
        required
        ltr
        error={fieldErrors['email']}
      />
      <SubmitButton submitting={submitting}>{t('submit')}</SubmitButton>
      <Link
        href={ROUTES.login}
        className="self-start text-sm font-semibold text-crimson-700 underline"
      >
        {t('backToLogin')}
      </Link>
    </form>
  );
}
