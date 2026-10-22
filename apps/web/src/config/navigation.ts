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
  signup: '/signup',
  account: '/app',
  /** Mentoring booking flow with career advice preselected (spec §3.1 closing CTA). */
  bookCareerAdvice: '/book?service=career',
  book: '/book',
} as const;

/**
 * Query values a page uses when they are missing from the URL, e.g. /mentoring shows
 * the mentoring tab. Used to mark the current header link.
 */
export const DEFAULT_QUERY: Record<string, string> = { tab: 'mentoring' };

/** Course details page of a program (spec §3.3). */
export const programPath = (slug: string) => `/courses/${encodeURIComponent(slug)}`;

/** Syllabus page of a program (spec §3.4). */
export const syllabusPath = (slug: string) => `${programPath(slug)}/syllabus`;

/** Enroll form with the program preselected (spec §3.2). */
export const enrollPath = (programSlug: string, cohortId?: string) =>
  `/enroll?program=${encodeURIComponent(programSlug)}` +
  (cohortId ? `&cohort=${encodeURIComponent(cohortId)}` : '');

/**
 * Booking flow with a package and a mentor preselected (spec §3.5), e.g.
 * /book?service=mentoring-8&mentor=… — the 8-session plan is the recommended default.
 */
export const bookMentorPath = (mentorId: string, service = 'mentoring-8') =>
  `/book?service=${encodeURIComponent(service)}&mentor=${encodeURIComponent(mentorId)}`;

/** A booking step with its choices, e.g. /book?service=mentoring-8&mentor=…&step=review. */
export const bookingPath = (query: string) => `/book?${query}`;

/** After payment: confirmation page that follows the booking until it is paid (spec §3.7 step 5). */
export const bookingConfirmationPath = (bookingId: string) =>
  `/book/confirmation?booking=${encodeURIComponent(bookingId)}`;

/** Sign-in or sign-up that returns to the given page afterwards. */
export const withNext = (route: string, next: string) =>
  `${route}?next=${encodeURIComponent(next)}`;

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

/** Student area pages (spec §4.2). */
export const STUDENT_ROUTES = {
  overview: '/app',
  courses: '/app/courses',
  sessions: '/app/sessions',
  payments: '/app/payments',
  profile: '/app/profile',
  messages: '/app/messages',
} as const;

export type StudentNavIcon = 'home' | 'courses' | 'sessions' | 'payments' | 'profile' | 'messages';

export interface StudentNavItem {
  label: string;
  href: string;
  icon: StudentNavIcon;
}

/** Sidebar on large screens (spec §4.2). Labels are keys under "Student.nav". */
export const STUDENT_SIDEBAR: StudentNavItem[] = [
  { label: 'overview', href: STUDENT_ROUTES.overview, icon: 'home' },
  { label: 'courses', href: STUDENT_ROUTES.courses, icon: 'courses' },
  { label: 'sessions', href: STUDENT_ROUTES.sessions, icon: 'sessions' },
  { label: 'payments', href: STUDENT_ROUTES.payments, icon: 'payments' },
  { label: 'profile', href: STUDENT_ROUTES.profile, icon: 'profile' },
  { label: 'messages', href: STUDENT_ROUTES.messages, icon: 'messages' },
];

/** Bottom tab bar on phones (spec §4.10: Home · Courses · Sessions · Messages · Account). */
export const STUDENT_TABS: StudentNavItem[] = [
  { label: 'home', href: STUDENT_ROUTES.overview, icon: 'home' },
  { label: 'courses', href: STUDENT_ROUTES.courses, icon: 'courses' },
  { label: 'sessions', href: STUDENT_ROUTES.sessions, icon: 'sessions' },
  { label: 'messages', href: STUDENT_ROUTES.messages, icon: 'messages' },
  { label: 'account', href: STUDENT_ROUTES.profile, icon: 'profile' },
];

/** Instructor area pages (designs "Instructor 1–6"); more are added as they are built. */
export const TEACH_ROUTES = {
  today: '/teach',
  cohorts: '/teach/cohorts',
} as const;

/** One cohort's page in the instructor area. */
export const teachCohortPath = (cohortId: string) =>
  `${TEACH_ROUTES.cohorts}/${encodeURIComponent(cohortId)}`;

export type TeachNavIcon = 'today' | 'cohorts';

/** Instructor sidebar. Labels are keys under "Teach.nav". */
export const TEACH_NAV: { label: string; href: string; icon: TeachNavIcon; exact?: boolean }[] = [
  { label: 'today', href: TEACH_ROUTES.today, icon: 'today', exact: true },
  { label: 'cohorts', href: TEACH_ROUTES.cohorts, icon: 'cohorts' },
];

/** Admin pages built so far. */
export const ADMIN_ROUTES = {
  home: '/admin',
  enrollments: '/admin/enrollments',
} as const;
