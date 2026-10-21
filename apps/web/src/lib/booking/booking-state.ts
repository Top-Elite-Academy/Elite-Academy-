import type { MentorCard, PackageInfo } from '@eta/shared';

/** Wizard steps shown in the progress bar (spec §3.7). Payment happens on the provider's page. */
export const BOOKING_STEPS = ['service', 'datetime', 'review', 'payment', 'confirmation'] as const;
export type BookingStep = (typeof BOOKING_STEPS)[number];

/** The steps the wizard page itself renders. */
export type WizardStep = 'service' | 'datetime' | 'review';
const WIZARD_STEPS: readonly WizardStep[] = ['service', 'datetime', 'review'];

/**
 * Everything the visitor chose, kept in the URL (/book?service=…&mentor=…&at=…&step=…)
 * so that signing in, reloading or the Back button never loses the choice.
 * These are ids only: the server looks up prices and checks every value again.
 */
export interface BookingChoice {
  service: string;
  mentorId: string | null;
  startAt: string | null;
  step: WizardStep;
}

/** Older links use the kind instead of a package code, e.g. /book?service=career. */
const SERVICE_ALIASES: Record<string, string> = {
  career: 'career-cv',
  mentoring: 'mentoring-8',
};

/** The package the link asks for, or the recommended mentoring plan when it is unknown. */
export function resolveService(packages: PackageInfo[], requested: string | null): string {
  const code = requested ? (SERVICE_ALIASES[requested] ?? requested) : null;
  if (code && packages.some((pkg) => pkg.code === code)) return code;
  return (packages.find((pkg) => pkg.recommended) ?? packages[0])?.code ?? '';
}

type Query = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => (typeof value === 'string' ? value : null);

/** Reads the choice from the URL, dropping anything that does not fit the catalog. */
export function parseBookingChoice(
  query: Query,
  packages: PackageInfo[],
  mentors: MentorCard[],
): BookingChoice {
  const service = resolveService(packages, single(query['service']));
  const kind = packages.find((pkg) => pkg.code === service)?.kind;
  const requestedMentor = single(query['mentor']);
  const mentorId =
    mentors.find((mentor) => mentor.id === requestedMentor && mentor.kind === kind)?.id ?? null;
  const at = single(query['at']);
  const startAt = mentorId && at && !Number.isNaN(Date.parse(at)) ? at : null;
  const requestedStep = single(query['step']) as WizardStep | null;
  const step = requestedStep && WIZARD_STEPS.includes(requestedStep) ? requestedStep : 'service';
  return { service, mentorId, startAt, step: furthestAllowedStep(step, mentorId, startAt) };
}

/** A step is only reachable when the earlier choices are made. */
function furthestAllowedStep(
  step: WizardStep,
  mentorId: string | null,
  startAt: string | null,
): WizardStep {
  if (!mentorId) return 'service';
  if (step === 'review' && !startAt) return 'datetime';
  return step;
}

/** The query string for a choice (locale-free path, see bookingPath). */
export function bookingQuery(choice: BookingChoice): string {
  const params = new URLSearchParams({ service: choice.service });
  if (choice.mentorId) params.set('mentor', choice.mentorId);
  if (choice.startAt) params.set('at', choice.startAt);
  if (choice.step !== 'service') params.set('step', choice.step);
  return params.toString();
}

/**
 * Services offered in step 1, in the design's order: career services first, then the
 * recommended mentoring plan. Another mentoring package chosen on the mentoring page
 * (e.g. 4 sessions) is added so that choice is never lost.
 */
export function serviceOptions(packages: PackageInfo[], selected: string): PackageInfo[] {
  const career = packages.filter((pkg) => pkg.kind === 'career');
  const mentoring = packages.filter(
    (pkg) => pkg.kind === 'instructor' && (pkg.recommended || pkg.code === selected),
  );
  return [...career, ...mentoring];
}

/** Booking ids are UUIDs; anything else in ?booking= is ignored (the API checks ownership). */
export const isBookingId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
