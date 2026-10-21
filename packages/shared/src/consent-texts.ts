import type { Locale } from './locales';

/**
 * Legal consent wording, versioned (spec §3.6, §9.10). The web form shows this
 * exact text and the API stores the same text with the time and IP, so the
 * record proves what the person agreed to. Never edit a published version:
 * add a new version and point CURRENT_* at it.
 */
export const CONSENT_TEXTS = {
  'contact-2026-10': {
    en: 'I agree that Elite Tech Academy may contact me about this program by phone and WhatsApp.',
    ar: 'أوافق على أن تتواصل معي أكاديمية إيليت تك بخصوص هذا البرنامج عبر الهاتف وواتساب.',
    he: 'אני מסכים/ה שאקדמיית אליט טק תיצור איתי קשר לגבי התוכנית הזו בטלפון ובוואטסאפ.',
  },
  'terms-2026-10': {
    en: 'I agree to the cancellation policy and the terms of use.',
    ar: 'أوافق على سياسة الإلغاء وشروط الاستخدام.',
    he: 'אני מסכים/ה למדיניות הביטולים ולתנאי השימוש.',
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type ConsentTextVersion = keyof typeof CONSENT_TEXTS;

/** The contact-consent wording used by the enroll form today. */
export const CURRENT_CONTACT_CONSENT: ConsentTextVersion = 'contact-2026-10';

/** The booking terms wording (spec §3.7 review step). */
export const CURRENT_TERMS_CONSENT: ConsentTextVersion = 'terms-2026-10';
