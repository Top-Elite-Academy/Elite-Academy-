'use client';

import { CONSENT_TEXTS, CURRENT_CONTACT_CONSENT, enrollSchema, type Locale } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { CheckboxField } from '@/components/forms/CheckboxField';
import { FormAlert } from '@/components/forms/FormAlert';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { Turnstile } from '@/components/forms/Turnstile';
import { useApiForm } from '@/components/forms/use-api-form';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { CallTimeFields } from './CallTimeFields';
import { EnrollDetailsFields, type ProgramOption } from './EnrollDetailsFields';
import { EnrollThankYou } from './EnrollThankYou';

interface EnrollFormProps {
  programs: ProgramOption[];
  defaultProgram: string | undefined;
  cohortId: string | undefined;
  nonce: string | undefined;
}

/**
 * Enroll — book a call (spec §3.6). Validated here and again on the server;
 * protected by a captcha and a hidden honeypot field. No payment.
 */
export function EnrollForm({ programs, defaultProgram, cohortId, nonce }: EnrollFormProps) {
  const t = useTranslations('Enroll');
  const locale = useLocale() as Locale;
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(enrollSchema);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  // Turnstile tokens are single-use: a new key re-creates the widget after a failed attempt.
  const [captchaKey, setCaptchaKey] = useState(0);
  const [done, setDone] = useState<{ firstName: string; programSlug: string } | null>(null);
  const onCaptchaToken = useCallback((token: string | undefined) => {
    setCaptchaToken(token);
  }, []);

  if (done) return <EnrollThankYou {...done} />;

  const submit = onSubmit(
    async (data) => {
      await apiRequest('POST', '/api/leads/website', data);
      setDone({ firstName: data.firstName, programSlug: data.programSlug });
    },
    {
      arrayFields: ['days', 'hours'],
      booleanFields: ['consent'],
      extra: { locale, captchaToken, ...(cohortId ? { cohortId } : {}) },
      onError: () => {
        setCaptchaToken(undefined);
        setCaptchaKey((key) => key + 1);
      },
    },
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-8">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}

      <section aria-labelledby="details-title" className="space-y-5">
        <h2 id="details-title" className="font-semibold text-ink">
          {t('detailsTitle')}
        </h2>
        <EnrollDetailsFields
          programs={programs}
          defaultProgram={defaultProgram}
          errors={fieldErrors}
        />
      </section>

      <section aria-labelledby="when-title" className="space-y-5 border-t border-border pt-8">
        <div>
          <h2 id="when-title" className="font-semibold text-ink">
            {t('whenTitle')}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t('whenIntro')}</p>
        </div>
        <CallTimeFields errors={fieldErrors} />
        <TextAreaField
          name="notes"
          label={t('notes')}
          optionalText={t('optional')}
          placeholder={t('notesPlaceholder')}
          maxLength={500}
          error={fieldErrors['notes']}
        />
      </section>

      <HoneypotField />

      <div className="space-y-5">
        <CheckboxField
          name="consent"
          required
          label={CONSENT_TEXTS[CURRENT_CONTACT_CONSENT][locale]}
          error={fieldErrors['consent']}
        />
        <p className="text-xs text-ink-muted">
          {t('privacy')}{' '}
          <Link href={ROUTES.privacy} className="rounded-sm text-crimson-700 underline">
            {t('privacyLink')}
          </Link>
        </p>
        <Turnstile key={captchaKey} nonce={nonce} label={t('captcha')} onToken={onCaptchaToken} />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={submitting}>
            {t('submit')}
          </Button>
          <p className="text-sm text-ink-muted">{t('noPayment')}</p>
        </div>
      </div>
    </form>
  );
}

/** Invisible to people and screen readers; bots that fill every field get filtered out (spec §9.4). */
function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute -start-[10000px] size-px overflow-hidden">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}
