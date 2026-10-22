import { addDays } from '@eta/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { jerusalemToday } from '../src/common/time/cohort-calendar';
import { type Browser, createUser, signIn, type TestUser } from './helpers/browser';
import { createTestApp, type TestApp } from './helpers/test-app';

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

const text = (en: string) => ({ en, ar: en, he: en });
const EVERY_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

let today: string;
let cohortId: string;
let mentorId: string;
let teacher: Browser;
let maya: TestUser;
let nour: TestUser;
let lina: TestUser;

beforeEach(async () => {
  await t.reset();
  today = jerusalemToday();
  const dania = await createUser(t, {
    email: 'dania@test.dev',
    roles: ['instructor'],
    withTotp: true,
  });
  teacher = await signIn(t, dania);
  mentorId = (
    await t.prisma.mentorProfile.create({
      data: {
        slug: 'dania',
        userId: dania.id,
        kind: 'instructor',
        name: text('Dania Hih'),
        role: text('r'),
        bio: text('b'),
        languages: ['ar'],
      },
    })
  ).id;
  const program = await t.prisma.program.create({
    data: {
      slug: 'fsa',
      title: text('Full Stack'),
      summary: text('s'),
      level: 'advanced',
      tags: [],
      published: true,
      lengthWeeks: 24,
      instructorId: mentorId,
    },
  });
  // A class every day for the last three weeks: the last ten days are class days.
  cohortId = (
    await t.prisma.cohort.create({
      data: {
        programId: program.id,
        name: 'FSA-03',
        startDate: new Date(`${addDays(today, -21)}T00:00:00Z`),
        schedule: { days: EVERY_DAY, from: '18:00', to: '21:00' },
        seatsTotal: 20,
        status: 'running',
      },
    })
  ).id;
  maya = await createUser(t, { email: 'maya@test.dev', roles: ['student'] });
  nour = await createUser(t, { email: 'nour@test.dev', roles: ['student'] });
  lina = await createUser(t, { email: 'lina@test.dev', roles: ['student'] });
  await t.prisma.enrollment.createMany({
    data: [
      { userId: maya.id, cohortId, status: 'confirmed' },
      { userId: nour.id, cohortId, status: 'confirmed' },
      { userId: lina.id, cohortId, status: 'pending' },
    ],
  });
});

const mark = (date: string, marks: { userId: string; status: string }[]) =>
  teacher.put(`/api/teach/cohorts/${cohortId}/attendance`, { date, marks });

describe('attendance (design "Instructor 2" Attendance tab)', () => {
  it('lists the last ten class days and the confirmed students', async () => {
    const response = await teacher.get(`/api/teach/cohorts/${cohortId}/attendance`);
    expect(response.body.classes).toHaveLength(10);
    expect(response.body.classes[0]).toBe(today);
    expect(response.body.date).toBe(today);
    expect(response.body.students.map((s: { userId: string }) => s.userId).sort()).toEqual(
      [maya.id, nour.id].sort(),
    );
  });

  it('saves marks for a real past class of confirmed students only', async () => {
    const yesterday = addDays(today, -1);
    expect(
      (
        await mark(yesterday, [
          { userId: maya.id, status: 'present' },
          { userId: nour.id, status: 'late' },
        ])
      ).status,
    ).toBe(204);
    const saved = (await teacher.get(`/api/teach/cohorts/${cohortId}/attendance?date=${yesterday}`))
      .body;
    expect(saved.students.find((s: { userId: string }) => s.userId === nour.id).status).toBe(
      'late',
    );

    // Marking again changes the mark (no duplicates).
    await mark(yesterday, [{ userId: nour.id, status: 'absent' }]);
    expect(await t.prisma.attendance.count({ where: { userId: nour.id } })).toBe(1);

    expect(
      (await mark(addDays(today, 3), [{ userId: maya.id, status: 'present' }])).body.code,
    ).toBe('attendance.notAClass');
    expect(
      (await mark(addDays(today, -40), [{ userId: maya.id, status: 'present' }])).body.code,
    ).toBe('attendance.notAClass');
    expect((await mark(yesterday, [{ userId: lina.id, status: 'present' }])).body.code).toBe(
      'attendance.notInCohort',
    );
  });

  it('is for the cohort’s instructor only', async () => {
    const rana = await createUser(t, {
      email: 'rana@test.dev',
      roles: ['instructor'],
      withTotp: true,
    });
    expect(
      (await (await signIn(t, rana)).get(`/api/teach/cohorts/${cohortId}/attendance`)).status,
    ).toBe(404);
    expect(
      (await (await signIn(t, maya)).get(`/api/teach/cohorts/${cohortId}/attendance`)).status,
    ).toBe(403);
  });
});

describe('progress in the student list and the student page (design "Instructor 3")', () => {
  async function threeClasses() {
    for (const offset of [-1, -2, -3]) {
      await mark(addDays(today, offset), [
        { userId: maya.id, status: 'present' },
        { userId: nour.id, status: 'absent' },
      ]);
    }
  }

  it('the student list shows attendance and status', async () => {
    await threeClasses();
    const students = (await teacher.get(`/api/teach/cohorts/${cohortId}/students`)).body as {
      userId: string;
      attendance: { rate: number | null };
      progress: string | null;
    }[];
    const byId = (id: string) => students.find((s) => s.userId === id);
    expect(byId(maya.id)).toMatchObject({ attendance: { rate: 100 }, progress: 'on_track' });
    expect(byId(nour.id)).toMatchObject({ attendance: { rate: 0 }, progress: 'at_risk' });
    expect(byId(lina.id)).toMatchObject({ attendance: { rate: null }, progress: null });
  });

  it('the student page: recent classes, mentoring plan, staff-only notes', async () => {
    await threeClasses();
    const credit = await t.prisma.packageCredit.create({
      data: {
        userId: nour.id,
        packageId: (
          await t.prisma.package.create({
            data: { code: 'mentoring-8', kind: 'instructor', sessions: 8, priceAgorot: 200_000 },
          })
        ).id,
        mentorId,
        total: 8,
        used: 2,
      },
    });
    expect(credit.used).toBe(2);

    const page = (await teacher.get(`/api/teach/cohorts/${cohortId}/students/${nour.id}`)).body;
    expect(page).toMatchObject({
      student: { firstName: 'Test' },
      status: 'at_risk',
      attendance: { attended: 0, marked: 3, rate: 0 },
      mentoringPlan: { total: 8, used: 2, lastSession: null },
      notes: [],
    });
    expect(
      page.attendance.recent.slice(0, 4).map((r: { status: string | null }) => r.status),
    ).toEqual([null, 'absent', 'absent', 'absent']);
    expect(JSON.stringify(page)).not.toContain('nour@test.dev');

    const empty = await teacher.post(`/api/teach/cohorts/${cohortId}/students/${nour.id}/notes`, {
      body: ' ',
    });
    expect(empty.body.fieldErrors).toEqual({ body: ['note.required'] });
    const notes = await teacher.post(`/api/teach/cohorts/${cohortId}/students/${nour.id}/notes`, {
      body: 'Missed 3 classes: new work shift.',
      sharedWithAdmissions: true,
    });
    expect(notes.body).toMatchObject([
      {
        body: 'Missed 3 classes: new work shift.',
        authorName: 'Test User',
        sharedWithAdmissions: true,
      },
    ]);

    // The student sees their attendance, never the notes.
    const own = await (await signIn(t, nour)).get('/api/me/enrollments');
    expect(own.body[0].attendance).toEqual({ attended: 0, marked: 3, rate: 0 });
    expect(JSON.stringify(own.body)).not.toContain('work shift');
  });

  it('unknown students are not found', async () => {
    const stranger = await createUser(t, { email: 'x@test.dev', roles: ['student'] });
    expect(
      (await teacher.get(`/api/teach/cohorts/${cohortId}/students/${stranger.id}`)).status,
    ).toBe(404);
    expect(
      (
        await teacher.post(`/api/teach/cohorts/${cohortId}/students/${stranger.id}/notes`, {
          body: 'x',
        })
      ).status,
    ).toBe(404);
  });
});
