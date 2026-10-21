'use client';

import {
  CONSENT_TEXTS,
  CURRENT_TERMS_CONSENT,
  type CheckoutResponse,
  type HoldResponse,
  holdBookingSchema,
  type Locale,
  type MentorCard,
  type PackageInfo,
} from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { CheckboxField } from '@/components/forms/CheckboxField';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useApiForm } from '@/components/forms/use-api-form';
import { ButtonLink } from '@/components/ui/Button';
import { ROUTES, withNext } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import type { WizardStep } from '@/lib/booking/booking-state';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { useMoney } from '@/lib/format/use-money';
import { useServiceText } from './use-service-text';

/**
 * Step 3 (spec §3.7): check the choice, agree to the terms, pay. Paying holds
 * the time for 10 minutes and opens the payment provider's hosted page — card
 * details are never typed into this site (spec §9.5).
 */
export function ReviewStep({
  pkg,
  mentor,
  startAt,
  signedIn,
  returnPath,
  onChange,
}: {
  pkg: PackageInfo;
  mentor: MentorCard;
  startAt: string;
  signedIn: boolean;
  /** This page with the current choice, to come back to after signing in. */
  returnPath: string;
  onChange: (step: WizardStep) => void;
}) {
  const t = useTranslations('Booking.review');
  const tSummary = useTranslations('Booking.summary');
  const text = useServiceText();
  const when = useBookingFormat();
  const money = useMoney();

  return (
    <div className="space-y-6">
      <dl className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-white px-5">
        <Detail
          label={tSummary('service')}
          onChange={() => {
            onChange('service');
          }}
        >
          {text.title(pkg.code)}
        </Detail>
        <Detail
          label={tSummary('mentor')}
          onChange={() => {
            onChange('service');
          }}
        >
          {mentor.name}
        </Detail>
        <Detail
          label={tSummary('when')}
          onChange={() => {
            onChange('datetime');
          }}
        >
          {when.longDay(startAt)} · <span dir="ltr">{when.time(startAt)}</span>
        </Detail>
        <Detail label={tSummary('total')}>{money(pkg.priceAgorot)}</Detail>
      </dl>

      {signedIn ? (
        <PayForm pkg={pkg} mentorId={mentor.id} startAt={startAt} />
      ) : (
        <section
          aria-labelledby="sign-in-to-pay"
          className="rounded-[var(--radius-card)] border border-border bg-sand/60 p-5"
        >
          <h2 id="sign-in-to-pay" className="font-semibold text-ink">
            {t('signInTitle')}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t('signInBody')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href={withNext(ROUTES.signup, returnPath)}>{t('createAccount')}</ButtonLink>
            <ButtonLink href={withNext(ROUTES.login, returnPath)} variant="secondary">
              {t('signIn')}
            </ButtonLink>
          </div>
        </section>
      )}

      <p className="text-sm text-ink-muted">
        <Link href={ROUTES.refunds} className="font-semibold text-crimson-700 underline">
          {t('policyLink')}
        </Link>
      </p>
    </div>
  );
}

function Detail({
  label,
  onChange,
  children,
}: {
  label: string;
  onChange?: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('Booking.review');
  return (
    <div className="py-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="flex items-center justify-between gap-4">
        <span className="min-w-0 font-semibold text-ink">{children}</span>
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            className="rounded-sm text-sm font-semibold text-crimson-700 underline underline-offset-4"
          >
            {t('change')}
            <span className="sr-only">{`: ${label}`}</span>
          </button>
        )}
      </dd>
    </div>
  );
}

function PayForm({
  pkg,
  mentorId,
  startAt,
}: {
  pkg: PackageInfo;
  mentorId: string;
  startAt: string;
}) {
  const t = useTranslations('Booking.review');
  const locale = useLocale() as Locale;
  const money = useMoney();
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(holdBookingSchema);

  const submit = onSubmit(
    async (data) => {
      const hold = await apiRequest<HoldResponse>('POST', '/api/bookings/hold', data);
      const { redirectUrl } = await apiRequest<CheckoutResponse>(
        'POST',
        `/api/bookings/${hold.bookingId}/checkout`,
        { locale },
      );
      window.location.assign(redirectUrl);
    },
    {
      extra: { service: pkg.code, mentorId, startAt, locale },
      booleanFields: ['agreeToTerms'],
    },
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <CheckboxField
        name="agreeToTerms"
        label={CONSENT_TEXTS[CURRENT_TERMS_CONSENT][locale]}
        required
        error={fieldErrors['agreeToTerms']}
      />
      <SubmitButton submitting={submitting}>
        {t('pay', { amount: money(pkg.priceAgorot) })}
      </SubmitButton>
      <ul className="space-y-1 text-sm text-ink-muted">
        <li>{t('holdNote')}</li>
        <li>{t('cardNote')}</li>
      </ul>
    </form>
  );
}
