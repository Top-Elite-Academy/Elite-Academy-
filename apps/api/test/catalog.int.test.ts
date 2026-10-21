import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Browser } from './helpers/browser';
import { createTestApp, type TestApp } from './helpers/test-app';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.reset();
});

const text = (en: string) => ({ en, ar: `${en} (ar)`, he: '' });
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

async function createProgram(slug: string, extra: Record<string, unknown> = {}) {
  return t.prisma.program.create({
    data: {
      slug,
      title: text(`Program ${slug}`),
      summary: text('Summary'),
      level: 'beginner',
      tags: ['SQL'],
      published: true,
      priceAgorot: 1_500_000,
      ...extra,
    },
  });
}

describe('GET /api/programs', () => {
  it('returns top programs in order, localized, with the next open cohort and never a price', async () => {
    const instructor = await t.prisma.mentorProfile.create({
      data: {
        slug: 'rana',
        kind: 'instructor',
        name: text('Rana'),
        role: text('r'),
        bio: text('b'),
        languages: ['en'],
      },
    });
    const second = await createProgram('second', { isTop: true, topOrder: 2 });
    const first = await createProgram('first', {
      isTop: true,
      topOrder: 1,
      instructorId: instructor.id,
    });
    await createProgram('not-top');
    await t.prisma.cohort.createMany({
      data: [
        { programId: first.id, name: 'past', startDate: daysFromNow(-10), seatsTotal: 10 },
        {
          programId: first.id,
          name: 'full',
          startDate: daysFromNow(3),
          seatsTotal: 10,
          seatsTaken: 10,
          status: 'full',
        },
        { programId: first.id, name: 'next', startDate: daysFromNow(7), seatsTotal: 10 },
        { programId: second.id, name: 'later', startDate: daysFromNow(30), seatsTotal: 10 },
      ],
    });

    const response = await new Browser(t).get('/api/programs?top=true&locale=ar');
    expect(response.status).toBe(200);
    expect(response.body.map((p: { slug: string }) => p.slug)).toEqual(['first', 'second']);
    expect(response.body[0]).toMatchObject({
      title: 'Program first (ar)',
      instructorName: 'Rana (ar)',
      nextCohortStart: daysFromNow(7).toISOString().slice(0, 10),
      subject: 'web',
    });
    expect(JSON.stringify(response.body)).not.toMatch(/price|1500000/i);
  });

  it('hides unpublished and deleted programs and falls back to English', async () => {
    await createProgram('visible');
    await createProgram('draft', { published: false });
    await createProgram('removed', { deletedAt: new Date() });

    const response = await new Browser(t).get('/api/programs?locale=he');
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Program visible');
  });

  it('rejects an unknown language', async () => {
    const response = await new Browser(t).get('/api/programs?locale=fr');
    expect(response.status).toBe(400);
  });
});

describe('GET /api/instructors and /api/faqs', () => {
  it('lists active instructors with their program, and published general FAQs', async () => {
    const dania = await t.prisma.mentorProfile.create({
      data: {
        slug: 'dania',
        kind: 'instructor',
        name: text('Dania'),
        role: text('r'),
        bio: text('Bio'),
        languages: ['en'],
        featured: true,
      },
    });
    await t.prisma.mentorProfile.create({
      data: {
        slug: 'old',
        kind: 'instructor',
        name: text('Old'),
        role: text('r'),
        bio: text('b'),
        languages: ['en'],
        active: false,
      },
    });
    await createProgram('fullstack', { instructorId: dania.id });
    await t.prisma.faq.createMany({
      data: [
        { key: 'b', question: text('Second?'), answer: text('2'), sortOrder: 2 },
        { key: 'a', question: text('First?'), answer: text('1'), sortOrder: 1 },
        { key: 'hidden', question: text('Hidden?'), answer: text('x'), published: false },
      ],
    });

    const browser = new Browser(t);
    const instructors = await browser.get('/api/instructors?locale=en');
    expect(instructors.body).toEqual([
      expect.objectContaining({
        slug: 'dania',
        featured: true,
        program: { slug: 'fullstack', title: 'Program fullstack' },
      }),
    ]);

    const faqs = await browser.get('/api/faqs?locale=en');
    expect(faqs.body.map((f: { question: string }) => f.question)).toEqual(['First?', 'Second?']);
  });
});

describe('GET /api/stories (spec §9.10)', () => {
  it('shows only published stories with recorded consent, and never examples outside development', async () => {
    const user = await t.prisma.user.create({
      data: { email: 'grad@test.dev', firstName: 'Grad', lastName: 'User', status: 'active' },
    });
    const consent = await t.prisma.consent.create({
      data: {
        userId: user.id,
        type: 'story',
        textVersion: 'story-v1',
        text: 'I agree',
        ip: '127.0.0.1',
      },
    });
    const story = (key: string, extra: Record<string, unknown>) =>
      t.prisma.successStory.create({
        data: { key, personName: key, programLabel: text('Grad'), quote: text('Quote'), ...extra },
      });
    await story('with-consent', { published: true, consentId: consent.id });
    await story('no-consent', { published: true });
    await story('draft', { published: false });
    await story('example', { isExample: true });

    const response = await new Browser(t).get('/api/stories?locale=en');
    expect(response.body.map((s: { key: string }) => s.key)).toEqual(['with-consent']);
  });
});

describe('GET /api/programs/:slug (spec §3.3)', () => {
  it('returns localized details, upcoming open/full cohorts, modules and program FAQ — never a price', async () => {
    const program = await createProgram('fullstack', {
      overview: text('Overview'),
      outcomes: { en: ['Build apps'], ar: ['ابنِ'], he: [] },
      teachingLanguages: ['ar', 'he'],
    });
    await t.prisma.programModule.create({
      data: {
        programId: program.id,
        sortOrder: 1,
        title: text('Basics'),
        weekFrom: 1,
        weekTo: 2,
        topics: { en: ['HTML'], ar: [], he: [] },
      },
    });
    await t.prisma.cohort.createMany({
      data: [
        {
          programId: program.id,
          name: 'open',
          startDate: daysFromNow(5),
          seatsTotal: 10,
          seatsTaken: 8,
          schedule: { days: ['sun', 'wed'], from: '18:00', to: '21:00' },
        },
        {
          programId: program.id,
          name: 'sold out',
          startDate: daysFromNow(9),
          seatsTotal: 10,
          seatsTaken: 10,
        },
        { programId: program.id, name: 'past', startDate: daysFromNow(-3), seatsTotal: 10 },
        {
          programId: program.id,
          name: 'running',
          startDate: daysFromNow(20),
          seatsTotal: 10,
          status: 'running',
        },
      ],
    });
    await t.prisma.faq.create({
      data: { key: 'p1', programId: program.id, question: text('Q?'), answer: text('A') },
    });

    const response = await new Browser(t).get('/api/programs/fullstack?locale=ar');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      overview: 'Overview (ar)',
      outcomes: ['ابنِ'],
      teachingLanguages: ['ar', 'he'],
      modules: [{ order: 1, title: 'Basics (ar)', weekFrom: 1, weekTo: 2, topics: ['HTML'] }],
      faqs: [{ key: 'p1', question: 'Q? (ar)' }],
    });
    expect(response.body.cohorts).toEqual([
      expect.objectContaining({
        seatsLeft: 2,
        status: 'open',
        schedule: { days: ['sun', 'wed'], from: '18:00', to: '21:00' },
      }),
      expect.objectContaining({ seatsLeft: 0, status: 'full', schedule: null }),
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(/price|1500000/i);
  });

  it('answers 404 for unknown, unpublished or malformed slugs', async () => {
    await createProgram('draft', { published: false });
    const browser = new Browser(t);
    expect((await browser.get('/api/programs/nope')).status).toBe(404);
    expect((await browser.get('/api/programs/draft')).status).toBe(404);
    expect((await browser.get('/api/programs/..%2Fusers')).status).toBe(404);
  });
});
