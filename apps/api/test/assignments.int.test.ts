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
const REPO = 'https://github.com/maya/auth-api';

let lessonId: string;
let cohortId: string;
let teacher: Browser;
let maya: Browser;
let mayaId: string;

/** An instructor with a program, a published lesson and a cohort in week 12 with Maya in it. */
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
  const lesson = await t.prisma.lesson.create({
    data: {
      programId: program.id,
      position: 12,
      title: 'Authentication and sessions',
      status: 'published',
      publishedAt: new Date(),
      createdById: dania.id,
    },
  });
  lessonId = lesson.id;
  const cohort = await t.prisma.cohort.create({
    data: {
      programId: program.id,
      name: 'FSA-03',
      startDate: new Date(`${addDays(jerusalemToday(), -77)}T00:00:00Z`),
      seatsTotal: 20,
      status: 'running',
    },
  });
  cohortId = cohort.id;
  const student = await createUser(t, { email: 'maya@test.dev', roles: ['student'] });
  mayaId = student.id;
  await t.prisma.enrollment.create({
    data: { userId: student.id, cohortId, status: 'confirmed' },
  });
  maya = await signIn(t, student);
});

async function exercise(dueWeek = 13) {
  const response = await teacher.put(`/api/teach/lessons/${lessonId}/assignment`, {
    title: 'Auth API',
    instructions: 'Add sign-in and protected routes.',
    dueWeek,
    rubric: [
      { title: 'Works correctly', maxPoints: 60 },
      { title: 'Code quality', maxPoints: 40 },
    ],
  });
  expect(response.status).toBe(200);
  return response.body as { id: string; rubric: { id: string; maxPoints: number }[] };
}

async function scanned(submissionId: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const files = await t.prisma.submissionFile.findMany({ where: { submissionId } });
    if (files.every((file) => file.scanStatus !== 'scanning')) return files;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('scan did not finish');
}

describe('exercises and grading (design "Instructor 4")', () => {
  it('the rubric must add up to 100; criteria keep their ids when edited', async () => {
    expect((await maya.get(`/api/me/lessons/${lessonId}/assignment`)).body).toEqual({
      assignment: null,
    });
    const wrong = await teacher.put(`/api/teach/lessons/${lessonId}/assignment`, {
      title: 'Auth API',
      instructions: '',
      dueWeek: 13,
      rubric: [{ title: 'Works', maxPoints: 50 }],
    });
    expect(wrong.status).toBe(400);

    const created = await exercise();
    const [works] = created.rubric;
    const edited = await teacher.put(`/api/teach/lessons/${lessonId}/assignment`, {
      title: 'Auth API',
      instructions: '',
      dueWeek: 14,
      rubric: [
        { id: works?.id, title: 'Works correctly', maxPoints: 70 },
        { id: 'made-up', title: 'Tests', maxPoints: 30 },
      ],
    });
    expect(edited.body.rubric[0].id).toBe(works?.id);
    expect(edited.body.rubric[1].id).not.toBe('made-up');
  });

  it('student hands in a link and a file; instructor grades a draft, then returns it', async () => {
    const { rubric } = await exercise();

    const empty = await maya.multipart(`/api/me/lessons/${lessonId}/submission`, 'files', [], {
      note: 'See the repo',
    });
    expect(empty.body.code).toBe('submission.empty');
    const notGitHub = await maya.multipart(`/api/me/lessons/${lessonId}/submission`, 'files', [], {
      repoUrl: 'https://evil.example/maya/auth-api',
    });
    expect(notGitHub.status).toBe(400);

    const handed = await maya.multipart(
      `/api/me/lessons/${lessonId}/submission`,
      'files',
      [{ name: 'notes.pdf', content: '%PDF-1.7 my notes' }],
      { repoUrl: REPO, note: 'Refresh tokens included.' },
    );
    expect(handed.status).toBe(200);
    expect(handed.body.submission).toMatchObject({
      repoUrl: REPO,
      lateDays: 0,
      status: 'submitted',
    });
    const submissionId = handed.body.submission.id as string;
    const [file] = await scanned(submissionId);
    expect(file?.scanStatus).toBe('clean');

    const list = await teacher.get(`/api/teach/cohorts/${cohortId}/submissions`);
    expect(list.body.counts).toEqual({ toGrade: 1, returned: 0 });
    expect(list.body.items[0]).toMatchObject({
      id: submissionId,
      student: { firstName: expect.any(String) },
      lateDays: 0,
      score: null,
    });

    const [works, quality] = rubric;
    const tooMany = await teacher.put(`/api/teach/submissions/${submissionId}/grade`, {
      scores: [{ criterionId: works?.id, points: 61, comment: '' }],
      feedback: '',
    });
    expect(tooMany.body.code).toBe('grade.tooManyPoints');

    const draft = await teacher.put(`/api/teach/submissions/${submissionId}/grade`, {
      scores: [{ criterionId: works?.id, points: 55, comment: 'Login works.' }],
      feedback: 'Good start.',
    });
    expect(draft.body).toMatchObject({ score: 55, status: 'submitted' });
    expect(
      (await teacher.post(`/api/teach/submissions/${submissionId}/return`, {})).body.code,
    ).toBe('grade.incomplete');
    // The student does not see a draft.
    expect(
      (await maya.get(`/api/me/lessons/${lessonId}/assignment`)).body.assignment.submission.grade,
    ).toBeNull();

    await teacher.put(`/api/teach/submissions/${submissionId}/grade`, {
      scores: [
        { criterionId: works?.id, points: 55, comment: 'Login works.' },
        { criterionId: quality?.id, points: 35, comment: '' },
      ],
      feedback: 'Good work.',
    });
    const returned = await teacher.post(`/api/teach/submissions/${submissionId}/return`, {});
    expect(returned.body).toMatchObject({ status: 'returned', score: 90 });

    const seen = await maya.get(`/api/me/lessons/${lessonId}/assignment`);
    expect(seen.body.assignment.submission.grade).toMatchObject({
      score: 90,
      feedback: 'Good work.',
    });
    const notification = await t.prisma.notification.findFirstOrThrow({
      where: { userId: mayaId },
    });
    expect(notification).toMatchObject({ type: 'submission_returned' });
    expect(t.mail.sent.at(-1)).toMatchObject({
      template: 'feedbackReturned',
      params: { score: 90 },
    });

    // Returned work is final.
    const again = await maya.multipart(`/api/me/lessons/${lessonId}/submission`, 'files', [], {
      repoUrl: REPO,
    });
    expect(again.body.code).toBe('submission.returned');
    const download = await maya.get(
      `/api/me/submissions/${submissionId}/files/${file?.id}/download`,
    );
    expect(download.status).toBe(302);
  });

  it('late work is accepted and marked late; infected files are not shown', async () => {
    await exercise(10); // Week 10 ended about two weeks ago.
    const handed = await maya.multipart(
      `/api/me/lessons/${lessonId}/submission`,
      'files',
      [{ name: 'starter.zip', content: 'X5O!P EICAR test' }],
      { repoUrl: REPO },
    );
    expect(handed.body.submission.lateDays).toBeGreaterThan(7);
    await scanned(handed.body.submission.id as string);
    const view = await maya.get(`/api/me/lessons/${lessonId}/assignment`);
    expect(view.body.assignment.submission.files).toEqual([]);
  });

  it('other instructors and students cannot reach the work', async () => {
    await exercise();
    const handed = await maya.multipart(`/api/me/lessons/${lessonId}/submission`, 'files', [], {
      repoUrl: REPO,
    });
    const submissionId = handed.body.submission.id as string;

    const rana = await signIn(
      t,
      await createUser(t, { email: 'rana@test.dev', roles: ['instructor'], withTotp: true }),
    );
    expect((await rana.get(`/api/teach/submissions/${submissionId}`)).status).toBe(404);
    expect((await rana.get(`/api/teach/cohorts/${cohortId}/submissions`)).status).toBe(404);
    expect((await rana.get(`/api/teach/lessons/${lessonId}/assignment`)).status).toBe(404);
    expect(
      (await teacher.get(`/api/teach/lessons/${lessonId}/assignment`)).body.assignment,
    ).toMatchObject({
      title: 'Auth API',
      submissionCount: 1,
    });

    const omar = await signIn(
      t,
      await createUser(t, { email: 'omar@test.dev', roles: ['student'] }),
    );
    expect((await omar.get(`/api/me/lessons/${lessonId}/assignment`)).status).toBe(404);
    expect(
      (await omar.delete(`/api/me/submissions/${submissionId}/files/${submissionId}`)).status,
    ).toBe(404);
    // Students never reach grading (wrong role: 403).
    expect((await maya.get(`/api/teach/submissions/${submissionId}`)).status).toBe(403);
  });
});
