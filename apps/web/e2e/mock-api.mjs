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

const routes = {
  '/api/programs': programs,
  '/api/instructors': instructors,
  '/api/faqs': faqs,
  '/api/stories': stories,
  '/api/health': { status: 'ok' },
};

createServer((request, response) => {
  const { pathname, searchParams } = new URL(request.url ?? '/', 'http://localhost');
  const isTop = pathname === '/api/programs' && searchParams.get('top') === 'true';
  const body = isTop ? programs.slice(0, 2) : routes[pathname];
  response.writeHead(body ? 200 : 404, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body ?? { statusCode: 404, code: 'notFound' }));
}).listen(PORT, '127.0.0.1');
