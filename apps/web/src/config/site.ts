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

/**
 * Accessibility coordinator named in the accessibility statement (IS 5568, required by law).
 * ⚠ PLACEHOLDERS — the real coordinator's name, email and phone are an open item.
 */
export const ACCESSIBILITY_CONTACT = {
  name: 'Accessibility coordinator',
  email: 'accessibility@elitetech.example',
  phoneE164: '+972000000000',
  phoneDisplay: '+972-00-000-0000',
  /** Promised reply time, in working days. */
  replyDays: 5,
  /** Date the statement was last reviewed (YYYY-MM-DD). Update it with every review. */
  statementUpdated: '2026-10-21',
} as const;
