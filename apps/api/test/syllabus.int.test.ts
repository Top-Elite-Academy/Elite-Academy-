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
const PDF = { name: 'Full Stack Syllabus.pdf', content: '%PDF-1.7 syllabus' };

let programId: string;
let cohortId: string;
let teacher: Browser;
let maya: Browser;

/** An instructor's program with a running cohort; Maya is confirmed in it. */
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
  const cohort = await t.prisma.cohort.create({
    data: {
      programId,
      name: 'FSA-03',
      startDate: new Date(`${addDays(jerusalemToday(), -14)}T00:00:00Z`),
      seatsTotal: 20,
      status: 'running',
    },
  });
  cohortId = cohort.id;
  const student = await createUser(t, { email: 'maya@test.dev', roles: ['student'] });
  await t.prisma.enrollment.create({ data: { userId: student.id, cohortId, status: 'confirmed' } });
  maya = await signIn(t, student);
});

async function scanned(fileId: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const file = await t.prisma.syllabusFile.findUnique({ where: { id: fileId } });
    if (file?.scanStatus !== 'scanning') return file;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('scan did not finish');
}

async function upload(content = PDF.content, name = PDF.name) {
  const response = await teacher.upload(`/api/teach/programs/${programId}/syllabus`, {
    name,
    content,
  });
  return response;
}

describe('program syllabus (spec §3.4, §6.2)', () => {
  it('accepts only real PDFs', async () => {
    expect((await upload('%PDF-1.7', 'syllabus.docx')).body.code).toBe('syllabus.pdfOnly');
    expect((await upload('MZ not a pdf', 'syllabus.pdf')).body.code).toBe('syllabus.pdfOnly');
    expect(await t.prisma.syllabusFile.count()).toBe(0);
  });

  it('a confirmed student downloads it once the scan says clean', async () => {
    const outline = async () =>
      (await maya.get('/api/me/courses/fsa')).body as { syllabus: Record<string, unknown> | null };
    expect((await outline()).syllabus).toBeNull();

    // A file still in the virus scan is never offered.
    await t.prisma.syllabusFile.create({
      data: { programId, fileName: 'waiting.pdf', sizeBytes: 5, storageKey: 'quarantine/x' },
    });
    expect((await outline()).syllabus).toBeNull();
    expect((await maya.get('/api/me/courses/fsa/syllabus/download')).status).toBe(404);
    await t.prisma.syllabusFile.deleteMany();

    const uploaded = await upload();
    expect(uploaded.status).toBe(201);
    expect(uploaded.body).toMatchObject({ fileName: PDF.name });

    const id = uploaded.body.id as string;
    expect((await scanned(id))?.scanStatus).toBe('clean');
    expect(t.storage.objects.has(`syllabi/${programId}/${id}`)).toBe(true);
    expect((await outline()).syllabus).toMatchObject({ fileName: PDF.name, sizeBytes: 17 });

    const download = await maya.get('/api/me/courses/fsa/syllabus/download');
    expect(download.status).toBe(302);
    expect(download.headers['location']).toContain(`syllabi/${programId}/${id}`);
  });

  it('pending students, other programs and other instructors get 404', async () => {
    await scanned((await upload()).body.id as string);

    const jad = await createUser(t, { email: 'jad@test.dev', roles: ['student'] });
    await t.prisma.enrollment.create({ data: { userId: jad.id, cohortId } });
    const pending = await signIn(t, jad);
    expect((await pending.get('/api/me/courses/fsa/syllabus/download')).status).toBe(404);

    const rana = await signIn(
      t,
      await createUser(t, { email: 'rana@test.dev', roles: ['instructor'], withTotp: true }),
    );
    expect((await rana.get(`/api/teach/programs/${programId}/syllabus`)).status).toBe(404);
    expect((await rana.upload(`/api/teach/programs/${programId}/syllabus`, PDF)).status).toBe(404);
    expect((await maya.get(`/api/teach/programs/${programId}/syllabus`)).status).toBe(403);
  });

  it('a new clean version replaces the old one; infected uploads are removed', async () => {
    const first = (await upload()).body.id as string;
    await scanned(first);

    const bad = (await upload('%PDF-1.7 EICAR test')).body.id as string;
    expect((await scanned(bad))?.scanStatus).toBe('infected');
    // The infected upload does not replace the current syllabus.
    expect((await maya.get('/api/me/courses/fsa')).body.syllabus).not.toBeNull();
    expect(await t.prisma.syllabusFile.findUnique({ where: { id: first } })).not.toBeNull();

    const second = (await upload('%PDF-1.7 version 2', 'Syllabus v2.pdf')).body.id as string;
    await scanned(second);
    const versions = (await teacher.get(`/api/teach/programs/${programId}/syllabus`)).body as {
      id: string;
    }[];
    expect(versions.map((version) => version.id)).toEqual([second]);
    expect(t.storage.objects.has(`syllabi/${programId}/${first}`)).toBe(false);
    expect((await maya.get('/api/me/courses/fsa')).body.syllabus.fileName).toBe('Syllabus v2.pdf');

    const teachDownload = await teacher.get(`/api/teach/syllabus/${second}/download`);
    expect(teachDownload.status).toBe(302);
    expect((await teacher.delete(`/api/teach/syllabus/${second}`)).status).toBe(204);
    expect((await maya.get('/api/me/courses/fsa')).body.syllabus).toBeNull();
  });
});
