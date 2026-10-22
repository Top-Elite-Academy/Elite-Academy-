import { filter, firstValueFrom, timeout } from 'rxjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RealtimeService } from '../src/modules/notifications/realtime.service';
import { Browser, createUser, signIn } from './helpers/browser';
import { createTestApp, type TestApp } from './helpers/test-app';

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

const text = (en: string) => ({ en, ar: en, he: en });
let cohortId: string;
let otherCohortId: string;
let teacher: Browser;

/** A program taught by `userId`, with one open cohort. */
async function programWithCohort(slug: string, userId: string | null, seatsTotal = 20) {
  const mentor = await t.prisma.mentorProfile.create({
    data: {
      slug,
      userId,
      kind: 'instructor',
      name: text(slug),
      role: text('r'),
      bio: text('b'),
      languages: ['ar'],
    },
  });
  const program = await t.prisma.program.create({
    data: {
      slug,
      title: text(`Program ${slug}`),
      summary: text('s'),
      level: 'beginner',
      tags: [],
      published: true,
      lengthWeeks: 24,
      instructorId: mentor.id,
    },
  });
  const cohort = await t.prisma.cohort.create({
    data: {
      programId: program.id,
      name: `${slug.toUpperCase()}-01`,
      startDate: new Date('2030-11-09'),
      schedule: { days: ['sun', 'wed'], from: '18:00', to: '21:00' },
      seatsTotal,
    },
  });
  return cohort.id;
}

async function student(email: string) {
  const user = await createUser(t, { email, roles: ['student'] });
  return { user, browser: await signIn(t, user) };
}

async function staff(email: string, roles: ('instructor' | 'sales' | 'admin')[]) {
  const user = await createUser(t, { email, roles, withTotp: true });
  return { user, browser: await signIn(t, user) };
}

beforeEach(async () => {
  await t.reset();
  const dania = await staff('dania@test.dev', ['instructor']);
  teacher = dania.browser;
  cohortId = await programWithCohort('fsa', dania.user.id, 1);
  const rana = await createUser(t, {
    email: 'rana@test.dev',
    roles: ['instructor'],
    withTotp: true,
  });
  otherCohortId = await programWithCohort('data', rana.id);
});

const join = (browser: Browser, id = cohortId) =>
  browser.post('/api/me/enrollments', { cohortId: id });

describe('joining a cohort (product decision: pick, then staff confirm)', () => {
  it('a student picks a cohort and waits as pending; the instructor sees them', async () => {
    const { browser } = await student('maya@test.dev');
    const available = (await browser.get('/api/me/available-cohorts')).body as { id: string }[];
    expect(available.map((c) => c.id).sort()).toEqual([cohortId, otherCohortId].sort());

    const joined = await join(browser);
    expect(joined.status).toBe(201);
    expect(joined.body).toMatchObject({ status: 'pending', announcements: [] });

    const students = (await teacher.get(`/api/teach/cohorts/${cohortId}/students`)).body;
    expect(students).toMatchObject([{ firstName: 'Test', status: 'pending' }]);
    expect(JSON.stringify(students)).not.toContain('maya@test.dev'); // no contact details
    expect((await teacher.get(`/api/teach/cohorts/${cohortId}`)).body).toMatchObject({
      confirmed: 0,
      pending: 1,
    });
  });

  it('staff confirm: a seat is taken, the student is told, and a full cohort refuses', async () => {
    const maya = await student('maya@test.dev');
    const nour = await student('nour@test.dev');
    const mayaEnrollment = (await join(maya.browser)).body.id as string;
    const nourEnrollment = (await join(nour.browser)).body.id as string;
    const sales = await staff('sales@test.dev', ['sales']);

    expect((await maya.browser.post(`/api/enrollments/${mayaEnrollment}/confirm`, {})).status).toBe(
      403,
    );
    const pending = (await sales.browser.get('/api/enrollments/pending')).body as { id: string }[];
    expect(pending).toHaveLength(2);

    expect(
      (await sales.browser.post(`/api/enrollments/${mayaEnrollment}/confirm`, {})).status,
    ).toBe(204);
    expect(
      (await sales.browser.post(`/api/enrollments/${mayaEnrollment}/confirm`, {})).status,
    ).toBe(404);
    expect((await t.prisma.cohort.findUniqueOrThrow({ where: { id: cohortId } })).seatsTaken).toBe(
      1,
    );

    // One seat only: the second confirmation is refused and nothing changes.
    const full = await sales.browser.post(`/api/enrollments/${nourEnrollment}/confirm`, {});
    expect(full.status).toBe(409);
    expect(full.body.code).toBe('cohort.full');

    const bell = (await maya.browser.get('/api/notifications')).body;
    expect(bell.unread).toBe(1);
    expect(bell.items[0]).toMatchObject({
      type: 'enrollment_confirmed',
      data: { cohortName: 'FSA-01', programTitle: 'Program fsa' },
    });
  });
});

describe('instructor area', () => {
  it('shows only the instructor’s own cohorts; students cannot enter', async () => {
    const cohorts = (await teacher.get('/api/teach/cohorts')).body as { id: string }[];
    expect(cohorts.map((c) => c.id)).toEqual([cohortId]);
    expect((await teacher.get(`/api/teach/cohorts/${otherCohortId}`)).status).toBe(404);
    expect((await teacher.get(`/api/teach/cohorts/${otherCohortId}/students`)).status).toBe(404);

    const { browser } = await student('maya@test.dev');
    expect((await browser.get('/api/teach/today')).status).toBe(403);

    const admin = await staff('admin@test.dev', ['admin']);
    expect(((await admin.browser.get('/api/teach/cohorts')).body as unknown[]).length).toBe(2);
  });
});

describe('announcements (live to confirmed students)', () => {
  async function confirmedAndPending() {
    const maya = await student('maya@test.dev');
    const nour = await student('nour@test.dev');
    await t.prisma.cohort.update({ where: { id: cohortId }, data: { seatsTotal: 5 } });
    const enrollment = (await join(maya.browser)).body.id as string;
    await join(nour.browser);
    const sales = await staff('sales@test.dev', ['sales']);
    await sales.browser.post(`/api/enrollments/${enrollment}/confirm`, {});
    await maya.browser.post('/api/notifications/read', {});
    return { maya, nour };
  }

  it('validates, reaches only confirmed students, live, and shows in their course', async () => {
    const { maya, nour } = await confirmedAndPending();
    const empty = await teacher.post(`/api/teach/cohorts/${cohortId}/announcements`, {
      title: '  ',
      body: 'x',
    });
    expect(empty.body.fieldErrors).toEqual({ title: ['announcement.titleRequired'] });
    expect(
      (
        await teacher.post(`/api/teach/cohorts/${otherCohortId}/announcements`, {
          title: 'a',
          body: 'b',
        })
      ).status,
    ).toBe(404);

    // Listen like an open browser tab before posting.
    const live = firstValueFrom(
      t.app
        .get(RealtimeService)
        .streamFor(maya.user.id)
        .pipe(
          filter((event) => event.type !== 'ping'),
          timeout(5000),
        ),
    );
    const posted = await teacher.post(`/api/teach/cohorts/${cohortId}/announcements`, {
      title: 'Class moved to 19:00',
      body: 'Wednesday’s class starts an hour later.',
    });
    expect(posted.status).toBe(201);

    const event = JSON.parse((await live).data as string) as { notification: { type: string } };
    expect(event.notification).toMatchObject({
      type: 'announcement',
      data: { title: 'Class moved to 19:00', cohortName: 'FSA-01' },
    });

    expect((await maya.browser.get('/api/notifications')).body.unread).toBe(1);
    expect((await nour.browser.get('/api/notifications')).body.unread).toBe(0); // still pending

    const courses = (await maya.browser.get('/api/me/enrollments')).body;
    expect(courses[0]).toMatchObject({
      status: 'confirmed',
      announcements: [{ title: 'Class moved to 19:00', authorName: 'Test User' }],
    });
    expect((await nour.browser.get('/api/me/enrollments')).body[0].announcements).toEqual([]);

    await maya.browser.post('/api/notifications/read', {});
    expect((await maya.browser.get('/api/notifications')).body.unread).toBe(0);
  });
});
