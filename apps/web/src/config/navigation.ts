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
  contact: '/contact',
  helpCenter: '/help',
  terms: '/terms',
  privacy: '/privacy',
  refunds: '/refunds',
  accessibility: '/accessibility',
  login: '/login',
  account: '/app',
} as const;

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

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Footer.learn',
    links: [
      { label: 'Nav.courses', href: ROUTES.courses },
      { label: 'Nav.mentoring', href: ROUTES.mentoring },
      { label: 'Nav.careerAdvice', href: ROUTES.careerAdvice },
      { label: 'Nav.faq', href: ROUTES.faq },
    ],
  },
  {
    title: 'Footer.help',
    links: [
      { label: 'Footer.helpCenter', href: ROUTES.helpCenter },
      { label: 'Nav.contact', href: ROUTES.contact },
    ],
  },
  {
    title: 'Footer.legal',
    links: [
      { label: 'Footer.terms', href: ROUTES.terms },
      { label: 'Footer.privacy', href: ROUTES.privacy },
      { label: 'Footer.refunds', href: ROUTES.refunds },
      { label: 'Footer.accessibility', href: ROUTES.accessibility },
    ],
  },
];
