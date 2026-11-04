import { addDays } from '@eta/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { jerusalemToday } from '../src/common/time/cohort-calendar';
import { type Browser, createUser, signIn } from './helpers/browser';
import { createTestApp, type TestApp } from './helpers/test-app';

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

const text = (en: string) => ({ en, ar: en, he: en });

let lessonId: string;
let programId: string;
let cohortId: string;
let teacher: Browser;
let maya: Browser;
let sara: Browser;

async function student(email: string, firstName: string, cohort: string): Promise<Browser> {
  const user = await createUser(t, { email, roles: ['student'] });
  await t.prisma.user.update({ where: { id: user.id }, data: { firstName, lastName: 'Rizk' } });
  await t.prisma.enrollment.create({
    data: { userId: user.id, cohortId: cohort, status: 'confirmed' },
  });
  return signIn(t, user);
}

async function newCohort(name: string) {
  const cohort = await t.prisma.cohort.create({
    data: {
      programId,
      name,
      startDate: new Date(`${addDays(jerusalemToday(), -77)}T00:00:00Z`),
      seatsTotal: 20,
      status: 'running',
    },
  });
  return cohort.id;
}

/** An instructor's program with one exercise; Maya and Sara study in cohort FSA-03. */
beforeEach(async () => {
  await t.reset();
  const dania = await createUser(t, {
    email: 'dania@test.dev',
    roles: ['instructor'],
    withTotp: true,
  });
  teacher = await signIn(t, dania);
  const mentor = await t.prisma.mentorProfile.create({
    data: {
      slug: 'dania',
      userId: dania.id,
      kind: 'instructor',
      name: text('Dania Hih'),
      role: text('r'),
      bio: text('b'),
      languages: ['ar'],
    },
  });
  const program = await t.prisma.program.create({
    data: {
      slug: 'fsa',
      title: text('Full Stack'),
      summary: text('s'),
      level: 'advanced',
      tags: [],
      published: true,
      lengthWeeks: 24,
      instructorId: mentor.id,
    },
  });
  programId = program.id;
  const lesson = await t.prisma.lesson.create({
    data: {
      programId,
      position: 12,
      title: 'Authentication and sessions',
      status: 'published',
      publishedAt: new Date(),
      createdById: dania.id,
    },
  });
  lessonId = lesson.id;
  await t.prisma.assignment.create({
    data: { lessonId, title: 'Auth API', dueWeek: 13, rubric: [] },
  });
  cohortId = await newCohort('FSA-03');
  maya = await student('maya@test.dev', 'Maya', cohortId);
  sara = await student('sara@test.dev', 'Sara', cohortId);
});

const bell = async (browser: Browser) =>
  (await browser.get('/api/notifications')).body as {
    items: { type: string; data: Record<string, string> }[];
  };

async function ask(browser = maya, title = 'How do I hash passwords?') {
  const response = await browser.post(`/api/me/lessons/${lessonId}/discussion`, {
    title,
    body: 'Which library?\n```ts\nhash(password)\n```',
  });
  expect(response.status).toBe(201);
  return (response.body as { id: string }).id;
}

describe('assignment discussions (spec §4.11)', () => {
  it('classmates see and answer questions; the instructor and the asker are told', async () => {
    const id = await ask();
    expect((await bell(teacher)).items[0]).toMatchObject({
      type: 'discussion_question',
      data: { threadId: id, name: 'Maya R.', audience: 'staff', lessonId, programSlug: 'fsa' },
    });

    const list = (await sara.get(`/api/me/lessons/${lessonId}/discussion`)).body;
    expect(list.discussion.threads).toHaveLength(1);
    expect(list.discussion.threads[0]).toMatchObject({
      title: 'How do I hash passwords?',
      author: { name: 'Maya R.', role: 'student', isMe: false },
      replyCount: 0,
      openReports: null,
    });

    const replied = await sara.post(`/api/discussions/${id}/replies`, { body: 'Use argon2.' });
    expect(replied.status).toBe(201);
    expect(replied.body.replies[0]).toMatchObject({ body: 'Use argon2.', canDelete: true });
    expect((await bell(maya)).items[0]).toMatchObject({
      type: 'discussion_reply',
      data: { threadId: id, name: 'Sara R.', audience: 'student' },
    });

    const teacherReply = await teacher.post(`/api/discussions/${id}/replies`, { body: 'Yes.' });
    expect(teacherReply.body.replies[1].author.role).toBe('staff');
  });

  it('other cohorts and outsiders get 404', async () => {
    const id = await ask();
    const other = await student('lina@test.dev', 'Lina', await newCohort('FSA-04'));
    expect((await other.get(`/api/discussions/${id}`)).status).toBe(404);
    expect((await other.post(`/api/discussions/${id}/replies`, { body: 'hi' })).status).toBe(404);
    expect(
      (await other.get(`/api/me/lessons/${lessonId}/discussion`)).body.discussion.threads,
    ).toEqual([]);

    const pending = await createUser(t, { email: 'jad@test.dev', roles: ['student'] });
    await t.prisma.enrollment.create({ data: { userId: pending.id, cohortId } });
    expect((await (await signIn(t, pending)).get(`/api/discussions/${id}`)).status).toBe(404);
  });

  it('validates the question', async () => {
    const empty = await maya.post(`/api/me/lessons/${lessonId}/discussion`, {
      title: ' ',
      body: '',
    });
    expect(empty.status).toBe(400);
  });

  it('students delete only their own posts; removed questions disappear for students', async () => {
    const id = await ask();
    expect((await sara.delete(`/api/discussions/${id}`)).status).toBe(403);
    const reply = (await sara.post(`/api/discussions/${id}/replies`, { body: 'Use bcrypt.' })).body
      .replies[0] as { id: string };
    expect((await maya.delete(`/api/discussions/replies/${reply.id}`)).status).toBe(403);
    expect((await sara.delete(`/api/discussions/replies/${reply.id}`)).status).toBe(204);

    const thread = (await maya.get(`/api/discussions/${id}`)).body;
    expect(thread.replies[0]).toMatchObject({ body: null, removed: 'author', canDelete: false });

    expect((await maya.delete(`/api/discussions/${id}`)).status).toBe(204);
    expect((await sara.get(`/api/discussions/${id}`)).status).toBe(404);
    expect(
      (await sara.get(`/api/me/lessons/${lessonId}/discussion`)).body.discussion.threads,
    ).toEqual([]);
    const forTeacher = (await teacher.get(`/api/teach/cohorts/${cohortId}/discussions`)).body;
    expect(forTeacher[0]).toMatchObject({ id, removed: 'author' });
    expect((await teacher.get(`/api/discussions/${id}`)).body.question.body).toContain(
      'Which library?',
    );
  });

  it('the instructor pins, marks the answer and removes posts; students cannot', async () => {
    const id = await ask();
    const reply = (await sara.post(`/api/discussions/${id}/replies`, { body: 'Use argon2.' })).body
      .replies[0] as { id: string };

    expect((await maya.patch(`/api/discussions/${id}`, { pinned: true })).status).toBe(403);
    const moderated = await teacher.patch(`/api/discussions/${id}`, {
      pinned: true,
      answerReplyId: reply.id,
    });
    expect(moderated.body).toMatchObject({
      pinned: true,
      answerReplyId: reply.id,
      moderator: true,
    });
    expect(
      (await maya.get(`/api/me/lessons/${lessonId}/discussion`)).body.discussion.threads[0],
    ).toMatchObject({ pinned: true, answered: true });

    expect((await teacher.delete(`/api/discussions/replies/${reply.id}`)).status).toBe(204);
    const after = (await maya.get(`/api/discussions/${id}`)).body;
    expect(after.answerReplyId).toBeNull();
    expect(after.replies[0]).toMatchObject({ body: null, removed: 'staff' });
  });

  it('students report posts once; the instructor sees the count, is told, and can keep or remove', async () => {
    const id = await ask();
    expect((await maya.post(`/api/discussions/${id}/report`, {})).status).toBe(409);
    expect(
      (await sara.post(`/api/discussions/${id}/report`, { reason: 'Full solution' })).status,
    ).toBe(204);
    expect((await sara.post(`/api/discussions/${id}/report`, {})).status).toBe(204);
    expect((await bell(teacher)).items[0]).toMatchObject({ type: 'discussion_report' });
    expect(await t.prisma.discussionReport.count()).toBe(1);

    const listed = (await teacher.get(`/api/teach/cohorts/${cohortId}/discussions`)).body;
    expect(listed[0].openReports).toBe(1);
    expect((await sara.get(`/api/discussions/${id}`)).body.question.openReports).toBeNull();

    expect((await teacher.post(`/api/discussions/${id}/reports/dismiss`, {})).status).toBe(204);
    expect(
      (await teacher.get(`/api/teach/cohorts/${cohortId}/discussions`)).body[0].openReports,
    ).toBe(0);
  });

  it('only the cohort instructor lists a cohort; other instructors get 404', async () => {
    await ask();
    const other = await createUser(t, {
      email: 'rana@test.dev',
      roles: ['instructor'],
      withTotp: true,
    });
    const rana = await signIn(t, other);
    expect((await rana.get(`/api/teach/cohorts/${cohortId}/discussions`)).status).toBe(404);
    expect((await maya.get(`/api/teach/cohorts/${cohortId}/discussions`)).status).toBe(403);
  });
});
