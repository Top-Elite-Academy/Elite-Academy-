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

let programId: string;
let moduleId: string;
let teacher: Browser;
let maya: Browser;

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
  moduleId = (
    await t.prisma.programModule.create({
      data: {
        programId,
        sortOrder: 3,
        title: text('Back end & data'),
        weekFrom: 10,
        weekTo: 14,
        topics: text('x'),
      },
    })
  ).id;
  // Week 12 of 24 today.
  const cohort = await t.prisma.cohort.create({
    data: {
      programId,
      name: 'FSA-03',
      startDate: new Date(`${addDays(jerusalemToday(), -77)}T00:00:00Z`),
      seatsTotal: 20,
      status: 'running',
    },
  });
  const student = await createUser(t, { email: 'maya@test.dev', roles: ['student'] });
  await t.prisma.enrollment.create({
    data: { userId: student.id, cohortId: cohort.id, status: 'confirmed' },
  });
  maya = await signIn(t, student);
});

async function lesson(title = 'Authentication and sessions') {
  const response = await teacher.post(`/api/teach/programs/${programId}/lessons`, {
    title,
    moduleId,
  });
  expect(response.status).toBe(201);
  return response.body as { id: string; position: number };
}

/** Waits for the background virus scan to finish. */
async function scanned(fileId: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const file = await t.prisma.lessonFile.findUniqueOrThrow({ where: { id: fileId } });
    if (file.scanStatus !== 'scanning') return file;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('scan did not finish');
}

async function readyVideo(lessonId: string) {
  const created = await teacher.post(`/api/teach/lessons/${lessonId}/videos`, {
    fileName: 'auth-part1.mp4',
    sizeBytes: 11,
  });
  expect(created.body.upload).toEqual({
    protocol: 'put',
    url: `/api/teach/videos/${created.body.video.id}/content`,
  });
  const put = await teacher.putRaw(
    created.body.upload.url as string,
    Buffer.from('fake-video!'),
    'video/mp4',
  );
  expect(put.body.status).toBe('ready');
  return created.body.video.id as string;
}

describe('course content for instructors (design "Instructor 6")', () => {
  it('creates and edits lessons of the programs the instructor teaches only', async () => {
    expect((await teacher.get('/api/teach/programs')).body).toEqual([
      { id: programId, slug: 'fsa', title: 'Full Stack', lessonCount: 0 },
    ]);
    const empty = await teacher.post(`/api/teach/programs/${programId}/lessons`, { title: ' ' });
    expect(empty.body.fieldErrors).toEqual({ title: ['lesson.titleRequired'] });

    const first = await lesson('Node.js and REST basics');
    const second = await lesson();
    expect([first.position, second.position]).toEqual([1, 2]);

    const updated = await teacher.patch(`/api/teach/lessons/${second.id}`, {
      about: 'Hashing passwords, sessions, protected routes.',
      availableFromWeek: 12,
    });
    expect(updated.body).toMatchObject({
      availableFromWeek: 12,
      status: 'draft',
      canPublish: true,
    });

    const rana = await createUser(t, {
      email: 'rana@test.dev',
      roles: ['instructor'],
      withTotp: true,
    });
    const other = await signIn(t, rana);
    expect((await other.get(`/api/teach/lessons/${second.id}`)).status).toBe(404);
    expect((await other.get('/api/teach/programs')).body).toEqual([]);
    expect((await maya.get(`/api/teach/lessons/${second.id}`)).status).toBe(403);
  });

  it('scans uploads: clean files become downloadable, infected ones are removed', async () => {
    const { id } = await lesson();
    const exe = await teacher.upload(
      `/api/teach/lessons/${id}/files`,
      { name: 'setup.exe', content: 'MZ' },
      { kind: 'material' },
    );
    expect(exe.body.code).toBe('file.type');

    const pdf = await teacher.upload(
      `/api/teach/lessons/${id}/files`,
      { name: 'C:\\fakepath\\lesson-12-slides.pdf', content: '%PDF-1.7 slides' },
      { kind: 'material' },
    );
    expect(pdf.body).toMatchObject({ fileName: 'lesson-12-slides.pdf', scanStatus: 'scanning' });
    const clean = await scanned(pdf.body.id as string);
    expect(clean.scanStatus).toBe('clean');
    expect(t.storage.objects.has(`lessons/${id}/${pdf.body.id}`)).toBe(true);
    expect(t.storage.objects.has(`quarantine/${pdf.body.id}`)).toBe(false);

    const bad = await teacher.upload(
      `/api/teach/lessons/${id}/files`,
      { name: 'starter.zip', content: 'X5O!P EICAR test' },
      { kind: 'exercise' },
    );
    const infected = await scanned(bad.body.id as string);
    expect(infected).toMatchObject({
      scanStatus: 'infected',
      scanSignature: 'Eicar-Test-Signature',
    });
    expect([...t.storage.objects.keys()].some((key) => key.includes(bad.body.id as string))).toBe(
      false,
    );
  });

  it('publishes only when every video is ready', async () => {
    const { id } = await lesson();
    const created = await teacher.post(`/api/teach/lessons/${id}/videos`, {
      fileName: 'part1.mp4',
      sizeBytes: 11,
    });
    expect((await teacher.post(`/api/teach/lessons/${id}/publish`, {})).body.code).toBe(
      'lesson.notReady',
    );
    expect(
      (
        await teacher.post(`/api/teach/lessons/${id}/videos`, {
          fileName: 'virus.exe',
          sizeBytes: 5,
        })
      ).body.fieldErrors,
    ).toEqual({ fileName: ['video.type'] });

    await teacher.putRaw(
      created.body.upload.url as string,
      Buffer.from('fake-video!'),
      'video/mp4',
    );
    const published = await teacher.post(`/api/teach/lessons/${id}/publish`, {});
    expect(published.body).toMatchObject({ status: 'published' });
    expect((await teacher.delete(`/api/teach/lessons/${id}`)).body.code).toBe('lesson.published');
  });
});

describe('lesson player for students (spec §4.8)', () => {
  async function publishedLesson(title: string, week: number | null) {
    const { id } = await lesson(title);
    await teacher.patch(`/api/teach/lessons/${id}`, { availableFromWeek: week });
    await readyVideo(id);
    const file = await teacher.upload(
      `/api/teach/lessons/${id}/files`,
      { name: 'notes.pdf', content: '%PDF notes' },
      { kind: 'material' },
    );
    await scanned(file.body.id as string);
    await teacher.post(`/api/teach/lessons/${id}/publish`, {});
    return { id, fileId: file.body.id as string };
  }

  it('shows published lessons, locks future weeks, plays and downloads, tracks completion', async () => {
    const open = await publishedLesson('Authentication and sessions', 12);
    const later = await publishedLesson('Calling AI models', 15);
    const draft = await lesson('Draft lesson');

    const outline = (await maya.get('/api/me/courses/fsa')).body;
    expect(outline.cohort).toMatchObject({ name: 'FSA-03', week: 12 });
    const lessons = outline.modules[0].lessons;
    expect(lessons.map((l: { title: string }) => l.title)).toEqual([
      'Authentication and sessions',
      'Calling AI models',
    ]);
    expect(lessons[1].lockedUntilWeek).toBe(15);

    expect((await maya.get(`/api/me/lessons/${later.id}`)).status).toBe(404);
    expect((await maya.get(`/api/me/lessons/${draft.id}`)).status).toBe(404);

    const player = (await maya.get(`/api/me/lessons/${open.id}`)).body;
    expect(player.videos[0].playback).toEqual({
      kind: 'file',
      url: expect.stringMatching(/^https:\/\/storage\.test\/videos\//),
    });
    expect(player.files).toEqual([
      { id: open.fileId, kind: 'material', fileName: 'notes.pdf', sizeBytes: 10 },
    ]);
    expect(player.nextLessonId).toBe(later.id);

    const download = await maya.get(`/api/me/lessons/${open.id}/files/${open.fileId}/download`);
    expect(download.status).toBe(302);
    expect(download.headers.location).toContain('download=notes.pdf');

    expect(
      (await maya.post(`/api/me/lessons/${open.id}/progress`, { completed: true })).status,
    ).toBe(204);
    const after = (await maya.get('/api/me/courses/fsa')).body;
    expect(after.progressPercent).toBe(50);
    expect(after.modules[0].lessons[0].completed).toBe(true);
  });

  it('is for confirmed students of the program only', async () => {
    const open = await publishedLesson('Authentication and sessions', null);
    const nour = await createUser(t, { email: 'nour@test.dev', roles: ['student'] });
    const pending = await signIn(t, nour);
    expect((await pending.get('/api/me/courses/fsa')).status).toBe(404);
    expect((await pending.get(`/api/me/lessons/${open.id}`)).status).toBe(404);
    expect(
      (await pending.get(`/api/me/lessons/${open.id}/files/${open.fileId}/download`)).status,
    ).toBe(404);
  });
});
