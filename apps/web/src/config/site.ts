/**
 * Contact details shown in the footer (spec §2).
 * ⚠ PLACEHOLDERS — real phone, email and social links are an open item (spec §12).
 * These are data, not UI text, so they live here rather than in messages/*.json.
 */
export const CONTACT = {
  email: 'info@elitetech.example',
  /** E.164, used for the tel: link. */
  phoneE164: '+972000000000',
  /** Display form; always rendered left-to-right, even in Arabic and Hebrew. */
  phoneDisplay: '+972-00-000-0000',
  /** WhatsApp chat link (wa.me + number without the plus). */
  whatsappUrl: 'https://wa.me/972000000000',
  social: {
    instagram: 'https://www.instagram.com/',
    linkedin: 'https://www.linkedin.com/',
    facebook: 'https://www.facebook.com/',
  },
} as const;

/** Language names are shown in their own script, whatever the current language. */
export const LOCALE_NAMES = {
  ar: 'العربية',
  he: 'עברית',
  en: 'English',
} as const;
