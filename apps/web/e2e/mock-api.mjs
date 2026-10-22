// Minimal stand-in for the NestJS public content endpoints, so browser tests
// run without a database. Started by playwright.config.ts on MOCK_API_PORT.
import { createServer } from 'node:http';
import { instructor, notificationStream, teachingRoutes } from './mock-teaching.mjs';

const PORT = Number(process.env.MOCK_API_PORT ?? 4100);

const programs = [
  {
    slug: 'data-analysis-ai',
    title: 'Data Analysis with AI',
    summary: 'Data',
    level: 'beginner',
    subject: 'data',
    tags: ['SQL', 'Python', 'AI'],
    lengthWeeks: null,
    nextCohortStart: '2030-11-02',
    instructorName: 'Rana Arafat',
  },
  {
    slug: 'full-stack-advanced-ai',
    title: 'Full Stack Advanced with AI',
    summary: 'Web',
    level: 'advanced',
    subject: 'web',
    tags: ['React', 'Node', 'AI'],
    lengthWeeks: 24,
    nextCohortStart: null,
    instructorName: 'Dania Hih',
  },
  {
    slug: 'devops',
    title: 'DevOps',
    summary: 'Ship software',
    level: 'intermediate',
    subject: 'devops',
    tags: ['Linux', 'Docker'],
    lengthWeeks: null,
    nextCohortStart: null,
    instructorName: null,
  },
];

const instructors = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'rana-arafat',
    name: 'Rana Arafat',
    role: 'Program instructor and mentor',
    bio: 'Rana bio.',
    photoPath: '/images/instructors/rana-arafat.jpg',
    featured: false,
    program: { slug: 'data-analysis-ai', title: 'Data Analysis with AI' },
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    slug: 'dania-hih',
    name: 'Dania Hih',
    role: 'Program instructor and mentor',
    bio: 'Dania bio.',
    photoPath: '/images/instructors/dania-hih.jpg',
    featured: true,
    program: { slug: 'full-stack-advanced-ai', title: 'Full Stack Advanced with AI' },
  },
];

const faqs = [
  { key: 'one', question: 'Do I need prior experience?', answer: 'Not for beginner programs.' },
  { key: 'two', question: 'How do I pay?', answer: 'You don’t pay when you enroll.' },
];

const stories = [
  {
    key: 'example',
    personName: 'Maya Rizk',
    programLabel: 'Web development graduate',
    outcome: null,
    quote: 'Weekly mentoring helped me.',
    photoPath: null,
  },
];

/** Course details (spec §3.3) for two programs: a full one and one without curriculum. */
const details = {
  'full-stack-advanced-ai': {
    ...programs[1],
    overview: 'A 24-week program.',
    audience: 'For people who know basic programming.',
    outcomes: ['Build typed front ends', 'Design REST APIs'],
    teachingLanguages: ['ar', 'he'],
    modules: [
      { order: 1, title: 'Modern JavaScript', weekFrom: 1, weekTo: 4, topics: ['Async/await'] },
      { order: 2, title: 'React', weekFrom: 5, weekTo: 9, topics: ['Components'] },
    ],
    cohorts: [
      {
        id: 'c1111111-1111-4111-8111-111111111111',
        startDate: '2030-11-09',
        schedule: { days: ['mon', 'wed'], from: '18:00', to: '21:00' },
        seatsLeft: 2,
        status: 'open',
      },
      {
        id: 'c2222222-2222-4222-8222-222222222222',
        startDate: '2031-01-10',
        schedule: null,
        seatsLeft: 0,
        status: 'full',
      },
      {
        id: 'c3333333-3333-4333-8333-333333333333',
        startDate: '2031-03-02',
        schedule: { days: ['sun'], from: '19:00', to: '22:00' },
        seatsLeft: 12,
        status: 'open',
      },
    ],
    instructor: { ...instructors[1], languages: ['ar', 'en'] },
    faqs: [{ key: 'q1', question: 'Do I get a certificate?', answer: 'Yes.' }],
  },
  devops: {
    ...programs[2],
    overview: 'Ship software.',
    audience: '',
    outcomes: [],
    teachingLanguages: [],
    modules: [],
    cohorts: [],
    instructor: null,
    faqs: [],
  },
};

const pkg = (code, kind, sessions, priceAgorot, recommended = false) => ({
  code,
  kind,
  sessions,
  priceAgorot,
  sessionMinutes: kind === 'career' ? 45 : 60,
  recommended,
});
const packages = [
  pkg('mentoring-1', 'instructor', 1, 25000),
  pkg('mentoring-4', 'instructor', 4, 100000),
  pkg('mentoring-8', 'instructor', 8, 200000, true),
  pkg('mentoring-12', 'instructor', 12, 300000),
  pkg('career-cv', 'career', 1, 25000),
  pkg('career-interview', 'career', 1, 30000),
];

/** Signed in when the test sets the mock_session cookie (forwarded by the web server). */
const student = {
  id: '99999999-9999-4999-8999-999999999999',
  email: 'maya@example.com',
  firstName: 'Maya',
  lastName: 'Rizk',
  roles: ['student'],
  locale: 'en',
  timeZone: 'Asia/Jerusalem',
  totpEnabled: false,
};

const mentor = (id, name, subject, program, languages, skills) => ({
  id,
  name,
  role: 'Program instructor and mentor',
  kind: 'instructor',
  subject,
  program,
  skills,
  languages,
  sessionMinutes: 60,
  photoPath: null,
});
const mentors = [
  mentor(
    '11111111-1111-4111-8111-111111111111',
    'Rana Arafat',
    'data',
    { slug: 'data-analysis-ai', title: 'Data Analysis with AI' },
    ['ar', 'en'],
    ['SQL'],
  ),
  mentor(
    '22222222-2222-4222-8222-222222222222',
    'Dania Hih',
    'web',
    { slug: 'full-stack-advanced-ai', title: 'Full Stack Advanced with AI' },
    ['ar', 'he'],
    ['React'],
  ),
];

/** Student area (spec §4): one session starting soon (Join open), one past, an 8-session plan. */
const inMinutes = (n) => new Date(Date.now() + n * 60_000).toISOString();
const rana = { id: mentors[0].id, name: 'Rana Arafat', photoPath: null };
const session = (id, startIn, extra = {}) => ({
  id,
  kind: 'instructor',
  service: 'mentoring-8',
  mentor: rana,
  startAt: inMinutes(startIn),
  endAt: inMinutes(startIn + 60),
  status: 'confirmed',
  joinUrl: null,
  joinOpensAt: inMinutes(startIn - 15),
  notes: null,
  // Changes close 24 hours before the start.
  canChange: startIn >= 24 * 60,
  refundRequested: false,
  fromPlan: true,
  ...extra,
});
const studentArea = {
  '/api/me/overview': () => ({
    upcoming: [
      session('s0000000-0000-4000-8000-000000000001', 10, { joinUrl: 'https://zoom.example/j/1' }),
    ],
    packages: [
      {
        id: 'f0000000-0000-4000-8000-000000000001',
        service: 'mentoring-8',
        mentor: rana,
        total: 8,
        used: 1,
        nextSessionAt: inMinutes(10),
        canBook: true,
      },
    ],
  }),
  '/api/me/sessions?scope=upcoming': () => [
    session('s0000000-0000-4000-8000-000000000001', 10, { joinUrl: 'https://zoom.example/j/1' }),
    session('s0000000-0000-4000-8000-000000000002', 3 * 24 * 60),
  ],
  '/api/me/sessions?scope=past': () => [
    session('s0000000-0000-4000-8000-000000000003', -2 * 24 * 60, {
      status: 'completed',
      notes: 'Covered protected routes. Next: refresh tokens.',
    }),
  ],
  '/api/me/orders': () => [
    {
      id: 'o1',
      createdAt: '2030-01-05T10:00:00.000Z',
      service: 'mentoring-8',
      sessions: 8,
      amountAgorot: 200000,
      status: 'paid',
      failureReason: null,
      retryBookingId: null,
    },
    {
      id: 'o2',
      createdAt: '2030-01-04T10:00:00.000Z',
      service: 'career-cv',
      sessions: 1,
      amountAgorot: 25000,
      status: 'failed',
      failureReason: 'card_declined',
      retryBookingId: 'b0000000-0000-4000-8000-000000000009',
    },
  ],
};

const routes = {
  '/api/programs': programs,
  '/api/instructors': instructors,
  '/api/faqs': faqs,
  '/api/packages': packages,
  '/api/stories': stories,
  '/api/health': { status: 'ok' },
};

createServer((request, response) => {
  const { pathname, searchParams } = new URL(request.url ?? '/', 'http://localhost');
  const isTop = pathname === '/api/programs' && searchParams.get('top') === 'true';
  const slug = pathname.startsWith('/api/programs/')
    ? pathname.slice('/api/programs/'.length)
    : null;
  const mentorList = searchParams.get('kind') === 'career' ? [] : mentors;
  const studentRoute = studentArea[pathname] ?? studentArea[request.url ?? ''];
  if (studentRoute) {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(studentRoute()));
    return;
  }
  // mock_session=1 signs in the student, mock_session=instructor the instructor.
  const session = /mock_session=([a-z0-9]+)/.exec(request.headers.cookie ?? '')?.[1];
  if (pathname === '/api/users/me') {
    const user = session === 'instructor' ? instructor : session ? student : null;
    response.writeHead(user ? 200 : 401, { 'content-type': 'application/json' });
    response.end(JSON.stringify(user ?? { statusCode: 401, code: 'auth.required' }));
    return;
  }
  if (pathname === '/api/notifications/stream') {
    notificationStream(response);
    return;
  }
  const teachingRoute = teachingRoutes[pathname];
  if (teachingRoute && request.method === 'GET') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(teachingRoute()));
    return;
  }
  const body = isTop
    ? programs.slice(0, 2)
    : slug
      ? details[slug]
      : pathname === '/api/mentors'
        ? mentorList
        : routes[pathname];
  response.writeHead(body ? 200 : 404, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body ?? { statusCode: 404, code: 'notFound' }));
}).listen(PORT, '127.0.0.1');
