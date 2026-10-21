// Minimal stand-in for the NestJS public content endpoints, so browser tests
// run without a database. Started by playwright.config.ts on MOCK_API_PORT.
import { createServer } from 'node:http';

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

const packages = [
  { code: 'mentoring-1', kind: 'instructor', sessions: 1, priceAgorot: 25000, recommended: false },
  { code: 'mentoring-4', kind: 'instructor', sessions: 4, priceAgorot: 100000, recommended: false },
  { code: 'mentoring-8', kind: 'instructor', sessions: 8, priceAgorot: 200000, recommended: true },
  {
    code: 'mentoring-12',
    kind: 'instructor',
    sessions: 12,
    priceAgorot: 300000,
    recommended: false,
  },
  { code: 'career', kind: 'career', sessions: 1, priceAgorot: 25000, recommended: false },
];

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
