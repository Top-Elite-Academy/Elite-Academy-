import type { Locale } from '@eta/shared';
import ar from './i18n/ar.json';
import en from './i18n/en.json';
import he from './i18n/he.json';

export type MailTemplate = keyof typeof en;

/** Each template's placeholders. Adding a template here makes the compiler check every caller. */
export interface MailParams {
  invitation: { firstName: string; link: string; hours: number };
  passwordReset: { firstName: string; link: string; minutes: number };
  bookingConfirmed: {
    firstName: string;
    mentorName: string;
    when: string;
    timeZone: string;
    link: string;
  };
}

export interface MailMessage<T extends MailTemplate = MailTemplate> {
  to: string;
  locale: Locale;
  template: T;
  params: MailParams[T];
}

export interface RenderedMail {
  subject: string;
  text: string;
}

const CATALOG: Record<Locale, typeof en> = { en, ar, he };

/** Plain-text emails only: nothing user-controlled is ever interpreted as HTML. */
export function renderMail(message: MailMessage): RenderedMail {
  const template = CATALOG[message.locale][message.template];
  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (match, key: string) => {
      const value = (message.params as unknown as Record<string, string | number>)[key];
      return value === undefined ? match : String(value);
    });
  return { subject: fill(template.subject), text: fill(template.body) };
}
