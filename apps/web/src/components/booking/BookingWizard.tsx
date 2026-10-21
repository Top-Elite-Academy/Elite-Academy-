'use client';

import type { MentorCard, PackageInfo } from '@eta/shared';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { Container } from '@/components/ui/Container';
import { bookingPath } from '@/config/navigation';
import {
  type BookingChoice,
  bookingQuery,
  parseBookingChoice,
  serviceOptions,
  type WizardStep,
} from '@/lib/booking/booking-state';
import { BookingProgress } from './BookingProgress';
import { BookingSummary } from './BookingSummary';
import { DateTimeStep } from './DateTimeStep';
import { ReviewStep } from './ReviewStep';
import { ServiceStep } from './ServiceStep';
import { ContinueButton, StepActions } from './StepActions';

/**
 * Booking steps 1–3 (spec §3.7). The choice lives in the URL, so the browser's
 * Back button, a reload or signing in on the way never lose it.
 */
export function BookingWizard({
  packages,
  mentors,
  signedIn,
}: {
  packages: PackageInfo[];
  mentors: MentorCard[];
  signedIn: boolean;
}) {
  const t = useTranslations('Booking');
  const tErrors = useTranslations('errors');
  const choice = parseBookingChoice(
    Object.fromEntries(useSearchParams().entries()),
    packages,
    mentors,
  );
  const pkg = packages.find((item) => item.code === choice.service);
  const mentor = mentors.find((item) => item.id === choice.mentorId);
  const [hint, setHint] = useState<string | null>(null);
  const headingRef = useStepFocus(choice.step);

  // Plain history updates: Next.js keeps useSearchParams in sync without reloading the page.
  const go = (next: BookingChoice, mode: 'push' | 'replace' = 'replace') => {
    setHint(null);
    const url = `${window.location.pathname}?${bookingQuery(next)}`;
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  };
  const toStep = (step: WizardStep) => {
    go({ ...choice, step }, 'push');
  };

  const onContinue = () => {
    if (choice.step === 'service') {
      if (choice.mentorId) toStep('datetime');
      else setHint(t('service.mentorRequired'));
    } else if (choice.startAt) toStep('review');
    else setHint(t('datetime.timeRequired'));
  };

  if (!pkg) {
    return (
      <Container className="py-12">
        <FormAlert tone="error">{tErrors('generic')}</FormAlert>
      </Container>
    );
  }

  const stepContent = {
    service: (
      <ServiceStep
        options={serviceOptions(packages, choice.service)}
        service={choice.service}
        mentors={mentors.filter((item) => item.kind === pkg.kind)}
        mentorId={choice.mentorId}
        onService={(code) => {
          const sameKind = packages.find((item) => item.code === code)?.kind === pkg.kind;
          go({
            ...choice,
            service: code,
            mentorId: sameKind ? choice.mentorId : null,
            startAt: null,
          });
        }}
        onMentor={(id) => {
          go({ ...choice, mentorId: id, startAt: null });
        }}
      />
    ),
    datetime: choice.mentorId && (
      <DateTimeStep
        mentorId={choice.mentorId}
        service={choice.service}
        startAt={choice.startAt}
        onTime={(startAt) => {
          go({ ...choice, startAt });
        }}
      />
    ),
    review: mentor && choice.startAt && (
      <ReviewStep
        pkg={pkg}
        mentor={mentor}
        startAt={choice.startAt}
        signedIn={signedIn}
        returnPath={bookingPath(bookingQuery(choice))}
        onChange={toStep}
      />
    ),
  }[choice.step];

  const continueLabel = t(choice.step === 'service' ? 'continue' : 'continueToReview');
  const actions = choice.step === 'review' ? null : { label: continueLabel, onClick: onContinue };

  return (
    <Container className="py-8 pb-32 lg:py-12">
      <BookingProgress current={choice.step} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-3xl font-semibold text-ink focus:outline-none"
          >
            {t(`${choice.step}.title`)}
          </h1>
          <p className="mt-2 text-ink-muted">
            {choice.step === 'datetime'
              ? t('datetime.intro', { zone: t('zone.jerusalem') })
              : choice.step === 'service'
                ? t('service.intro')
                : null}
          </p>
          <div className="mt-6">{stepContent}</div>
          {hint && (
            <div className="mt-6">
              <FormAlert tone="error">{hint}</FormAlert>
            </div>
          )}
          <StepActions
            onBack={
              choice.step === 'service'
                ? null
                : () => {
                    toStep(previous(choice.step));
                  }
            }
            next={actions}
            totalAgorot={pkg.priceAgorot}
          />
        </div>
        <div className="lg:sticky lg:top-6">
          <BookingSummary pkg={pkg} mentor={mentor} startAt={choice.startAt}>
            {actions && <ContinueButton {...actions} />}
          </BookingSummary>
        </div>
      </div>
    </Container>
  );
}

const previous = (step: WizardStep): WizardStep => (step === 'review' ? 'datetime' : 'service');

/** Moves focus to the step heading when the step changes, so screen readers hear where they are. */
function useStepFocus(step: WizardStep) {
  const ref = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.focus();
  }, [step]);
  return ref;
}
