import type { Job } from 'bullmq';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { MessageEmailJob } from '../src/modules/messaging/messaging.service';
import { UnreadEmailProcessor } from '../src/modules/messaging/unread-email.processor';
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

let danaId: string;
let mayaId: string;
let teacher: Browser;
let maya: Browser;
let omar: Browser;

/** Dania teaches Full Stack; Maya is confirmed in its cohort; Omar is a student elsewhere. */
beforeEach(async () => {
  await t.reset();
  const dania = await createUser(t, {
    email: 'dania@test.dev',
    roles: ['instructor'],
    withTotp: true,
  });
  danaId = dania.id;
  teacher = await signIn(t, dania);
  const mentor = await t.prisma.mentorProfile.create({
    data: {
      slug: 'dania',
      userId: dania.id,
      kind: 'instructor',
      name: text('Dania Hih'),
      role: text('Instructor'),
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
  const cohort = await t.prisma.cohort.create({
    data: {
      programId: program.id,
      name: 'FSA-03',
      startDate: new Date('2030-01-06T00:00:00Z'),
      seatsTotal: 20,
    },
  });
  const student = await createUser(t, { email: 'maya@test.dev', roles: ['student'] });
  mayaId = student.id;
  await t.prisma.enrollment.create({
    data: { userId: student.id, cohortId: cohort.id, status: 'confirmed' },
  });
  maya = await signIn(t, student);
  omar = await signIn(t, await createUser(t, { email: 'omar@test.dev', roles: ['student'] }));
});

async function scanned(messageId: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const files = await t.prisma.messageAttachment.findMany({ where: { messageId } });
    if (files.every((file) => file.scanStatus !== 'scanning')) return files;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('scan did not finish');
}

describe('messages & support (spec §4.9)', () => {
  it('students write to their instructor and the teams, never to other students', async () => {
    const recipients = await maya.get('/api/messages/recipients');
    expect(recipients.body).toEqual([
      expect.objectContaining({ kind: 'person', userId: danaId, context: 'Full Stack · FSA-03' }),
      { kind: 'team', team: 'support' },
      { kind: 'team', team: 'payments' },
    ]);
    const toStudent = await maya.post('/api/messages/conversations', {
      to: (await t.prisma.user.findFirstOrThrow({ where: { email: 'omar@test.dev' } })).id,
      body: 'Hi Omar',
    });
    expect(toStudent.status).toBe(404);
    // Omar has no instructor yet.
    const omarStart = await omar.post('/api/messages/conversations', { to: danaId, body: 'Hi' });
    expect(omarStart.status).toBe(404);
  });

  it('a thread: send, unread for the other side, read on opening, attachments scanned', async () => {
    const started = await maya.post('/api/messages/conversations', {
      to: danaId,
      subject: 'Lesson 12',
      body: 'How do refresh tokens rotate?',
    });
    expect(started.status).toBe(201);
    const id = started.body.id as string;
    // Starting again reuses the same thread.
    const again = await maya.post('/api/messages/conversations', { to: danaId, body: 'Also…' });
    expect(again.body.id).toBe(id);

    const inbox = await teacher.get('/api/messages/conversations');
    expect(inbox.body.unread).toBe(1);
    expect(inbox.body.items[0]).toMatchObject({
      id,
      subject: 'Lesson 12',
      counterpart: { kind: 'person', role: 'student', userId: mayaId },
      unread: 2,
      lastMessage: { body: 'Also…', fromMe: false },
    });
    expect(
      (await teacher.get('/api/messages/conversations?filter=unread&q=refresh')).body.items,
    ).toHaveLength(1);
    expect(
      (await teacher.get('/api/messages/conversations?q=nothing-like-this')).body.items,
    ).toHaveLength(0);

    const thread = await teacher.get(`/api/messages/conversations/${id}`);
    expect(thread.body.messages.map((message: { body: string }) => message.body)).toEqual([
      'How do refresh tokens rotate?',
      'Also…',
    ]);
    expect((await teacher.get('/api/messages/unread')).body.unread).toBe(0);

    const reply = await teacher.multipart(
      `/api/messages/conversations/${id}/messages`,
      'files',
      [{ name: 'diagram.png', content: 'PNG image' }],
      { body: 'See the diagram.' },
    );
    expect(reply.status).toBe(201);
    const last = reply.body.messages.at(-1);
    expect(last).toMatchObject({ fromMe: true, body: 'See the diagram.' });
    const [file] = await scanned(last.id as string);
    expect(file?.scanStatus).toBe('clean');

    const seen = await maya.get(`/api/messages/conversations/${id}`);
    expect(seen.body.counterpart).toMatchObject({ kind: 'person', role: 'staff', userId: danaId });
    expect(seen.body.readByOthersAt).not.toBeNull();
    expect((await maya.get(`/api/messages/attachments/${file?.id}/download`)).status).toBe(302);

    // Nobody else reaches the thread or its files.
    expect((await omar.get(`/api/messages/conversations/${id}`)).status).toBe(404);
    expect((await omar.get(`/api/messages/attachments/${file?.id}/download`)).status).toBe(404);
    const exe = await maya.multipart(`/api/messages/conversations/${id}/messages`, 'files', [
      { name: 'tool.exe', content: 'MZ' },
    ]);
    expect(exe.body.code).toBe('file.type');
  });

  it('team threads reach the right staff; unread messages are emailed after 30 minutes', async () => {
    const admin = await signIn(
      t,
      await createUser(t, { email: 'admin@test.dev', roles: ['admin'], withTotp: true }),
    );
    const sales = await signIn(
      t,
      await createUser(t, { email: 'sales@test.dev', roles: ['sales'], withTotp: true }),
    );
    const support = await maya.post('/api/messages/conversations', {
      to: 'support',
      body: 'I cannot open the video.',
    });
    const payments = await maya.post('/api/messages/conversations', {
      to: 'payments',
      body: 'Can I pay in installments?',
    });
    const adminInbox = await admin.get('/api/messages/conversations');
    expect(adminInbox.body.items).toHaveLength(2);
    const salesInbox = await sales.get('/api/messages/conversations');
    expect(salesInbox.body.items.map((item: { id: string }) => item.id)).toEqual([
      payments.body.id,
    ]);
    expect((await sales.get(`/api/messages/conversations/${support.body.id}`)).status).toBe(404);
    expect((await teacher.get('/api/messages/conversations')).body.items).toHaveLength(0);

    // A direct message the instructor has not read is emailed; a read one is not.
    const direct = await maya.post('/api/messages/conversations', { to: danaId, body: 'Hello' });
    const processor = t.app.get(UnreadEmailProcessor);
    const message = await t.prisma.message.findFirstOrThrow({
      where: { conversationId: direct.body.id as string },
    });
    const job = { data: { messageId: message.id } } as Job<MessageEmailJob>;
    await processor.process(job);
    expect(t.mail.sent.at(-1)).toMatchObject({
      to: 'dania@test.dev',
      template: 'unreadMessage',
    });
    t.mail.sent.length = 0;
    await teacher.get(`/api/messages/conversations/${direct.body.id}`);
    await processor.process(job);
    expect(t.mail.sent).toHaveLength(0);
  });
});
