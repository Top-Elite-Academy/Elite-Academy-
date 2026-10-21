/**
 * Every navigation link of the public site, in one place (spec §2).
 * `label` is a key in the messages files; `href` is locale-free (next-intl adds /en, /ar, /he).
 */
export interface NavItem {
  label: string;
  href: string;
}

export const ROUTES = {
  home: '/',
  courses: '/courses',
  mentoring: '/mentoring?tab=mentoring',
  careerAdvice: '/mentoring?tab=career',
  stories: '/#stories',
  faq: '/#faq',
  enroll: '/enroll',
  contact: '/contact',
  helpCenter: '/help',
  terms: '/terms',
  privacy: '/privacy',
  refunds: '/refunds',
  accessibility: '/accessibility',
  login: '/login',
  account: '/app',
  /** Mentoring booking flow with career advice preselected (spec §3.1 closing CTA). */
  bookCareerAdvice: '/book?service=career',
} as const;

/** Course details page of a program (spec §3.3). */
export const programPath = (slug: string) => `/courses/${encodeURIComponent(slug)}`;

/** Booking flow with mentoring and a mentor preselected (spec §3.5). */
export const bookMentorPath = (mentorId: string) =>
  `/book?service=mentoring&mentor=${encodeURIComponent(mentorId)}`;

/** Desktop header links. */
export const HEADER_NAV: NavItem[] = [
  { label: 'Nav.courses', href: ROUTES.courses },
  { label: 'Nav.mentoring', href: ROUTES.mentoring },
  { label: 'Nav.careerAdvice', href: ROUTES.careerAdvice },
  { label: 'Nav.successStories', href: ROUTES.stories },
];

/** Full-screen mobile menu (board "Mobile · Menu open"). */
export const MOBILE_NAV: NavItem[] = [
  { label: 'Nav.courses', href: ROUTES.courses },
  { label: 'Nav.teacherMentoring', href: ROUTES.mentoring },
  { label: 'Nav.careerAdvice', href: ROUTES.careerAdvice },
  { label: 'Nav.successStories', href: ROUTES.stories },
  { label: 'Nav.faq', href: ROUTES.faq },
  { label: 'Nav.contact', href: ROUTES.contact },
];

export interface FooterColumn {
  title: string;
  links: NavItem[];
}

/** Footer columns as in the landing design; the accessibility statement is required by IS 5568. */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Footer.platform',
    links: [
      { label: 'Nav.courses', href: ROUTES.courses },
      { label: 'Nav.mentoring', href: ROUTES.mentoring },
      { label: 'Nav.careerAdvice', href: ROUTES.careerAdvice },
      { label: 'Nav.successStories', href: ROUTES.stories },
    ],
  },
  {
    title: 'Footer.support',
    links: [
      { label: 'Footer.helpCenter', href: ROUTES.helpCenter },
      { label: 'Nav.contact', href: ROUTES.contact },
      { label: 'Nav.faq', href: ROUTES.faq },
    ],
  },
  {
    title: 'Footer.policies',
    links: [
      { label: 'Footer.terms', href: ROUTES.terms },
      { label: 'Footer.privacy', href: ROUTES.privacy },
      { label: 'Footer.refunds', href: ROUTES.refunds },
      { label: 'Footer.accessibility', href: ROUTES.accessibility },
    ],
  },
];
