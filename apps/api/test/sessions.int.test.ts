import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Browser, createUser, signIn, type TestUser } from './helpers/browser';
import { createTestApp, type TestApp } from './helpers/test-app';

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

const text = (en: string) => ({ en, ar: en, he: en });
const hours = (n: number) => new Date(Date.now() + n * 3_600_000);

let mentorId: string;
let teacher: Browser;
let plan: { id: string };
let single: { id: string };
let student: { user: TestUser; browser: Browser };

beforeEach(async () => {
  await t.reset();
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
  await t.prisma.availabilitySlot.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      mentorId,
      weekday,
      startTime: '08:00',
      endTime: '22:00',
    })),
  });
  single = await t.prisma.package.create({
    data: { code: 'mentoring-1', kind: 'instructor', sessions: 1, priceAgorot: 25_000 },
  });
  plan = await t.prisma.package.create({
    data: { code: 'mentoring-8', kind: 'instructor', sessions: 8, priceAgorot: 200_000 },
  });
  const user = await createUser(t, { email: 'maya@test.dev', roles: ['student'] });
  student = { user, browser: await signIn(t, user) };
});

async function freeSlots(service = 'mentoring-8'): Promise<string[]> {
  const response = await new Browser(t).get(
    `/api/booking/slots?mentorId=${mentorId}&service=${service}`,
  );
  return (response.body as { startAt: string }[]).map((slot) => slot.startAt);
}

/** A confirmed plan session (credit) or a paid single session. */
async function session(startAt: Date, kind: 'plan' | 'single' = 'plan', used = 1) {
  const credit =
    kind === 'plan'
      ? await t.prisma.packageCredit.create({
          data: { userId: student.user.id, packageId: plan.id, mentorId, total: 8, used },
        })
      : null;
  const order =
    kind === 'single'
      ? await t.prisma.order.create({
          data: {
            userId: student.user.id,
            items: [{ packageCode: 'mentoring-1', sessions: 1, priceAgorot: 25_000 }],
            amountAgorot: 25_000,
            provider: 'test',
            status: 'paid',
          },
        })
      : null;
  const booking = await t.prisma.booking.create({
    data: {
      userId: student.user.id,
      mentorId,
      packageId: kind === 'plan' ? plan.id : single.id,
      startAt,
      endAt: new Date(startAt.getTime() + 3_600_000),
      status: 'confirmed',
      creditId: credit?.id ?? null,
      orderId: order?.id ?? null,
    },
  });
  return { booking, credit, order };
}

const bell = async (browser: Browser) =>
  (await browser.get('/api/notifications')).body as {
    unread: number;
    items: { type: string; data: Record<string, string> }[];
  };

describe('mentor availability (design "Instructor 5")', () => {
  it('validates, saves hours and settings, and only those hours are offered', async () => {
    const initial = (await teacher.get('/api/teach/availability')).body;
    expect(initial).toMatchObject({ breakMinutes: 15, minNoticeHours: 24, sessionMinutes: 60 });

    const overlap = await teacher.put('/api/teach/availability', {
      windows: [
        { weekday: 1, startTime: '10:00', endTime: '13:00' },
        { weekday: 1, startTime: '12:00', endTime: '14:00' },
      ],
      breakMinutes: 15,
      minNoticeHours: 24,
    });
    expect(overlap.body.fieldErrors).toEqual({ windows: ['availability.overlap'] });
    expect(
      (
        await teacher.put('/api/teach/availability', {
          windows: [],
          breakMinutes: 7,
          minNoticeHours: 24,
        })
      ).status,
    ).toBe(400);

    const saved = await teacher.put('/api/teach/availability', {
      windows: [{ weekday: 1, startTime: '10:00', endTime: '13:00' }],
      breakMinutes: 0,
      minNoticeHours: 3,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.windows).toEqual([{ weekday: 1, startTime: '10:00', endTime: '13:00' }]);

    const slots = await freeSlots();
    expect(slots.length).toBeGreaterThanOrEqual(3);
    for (const startAt of slots) {
      const local = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jerusalem',
        weekday: 'short',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(startAt));
      expect(local).toMatch(/^Mon,? (10|11|12)$/);
    }
  });

  it('time off removes those days; deleting it brings them back', async () => {
    const before = await freeSlots();
    const today = new Date().toISOString().slice(0, 10);
    const in20 = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    expect(
      (
        await teacher.post('/api/teach/time-off', {
          startDate: '2000-01-01',
          endDate: '2000-01-02',
        })
      ).body.code,
    ).toBe('timeOff.past');
    expect(
      (await teacher.post('/api/teach/time-off', { startDate: today, endDate: in20 })).status,
    ).toBe(204);
    expect(await freeSlots()).toEqual([]);

    const [range] = (await teacher.get('/api/teach/availability')).body.timeOff as { id: string }[];
    expect((await teacher.delete(`/api/teach/time-off/${range!.id}`)).status).toBe(204);
    expect(await freeSlots()).toEqual(before);
  });

  it('is for mentors only', async () => {
    expect((await student.browser.get('/api/teach/availability')).status).toBe(403);
    const other = await createUser(t, {
      email: 'rana@test.dev',
      roles: ['instructor'],
      withTotp: true,
    });
    const response = await (await signIn(t, other)).get('/api/teach/availability');
    expect(response.body.code).toBe('mentor.notLinked');
  });
});

describe('student: book the next meeting, reschedule, cancel (spec §4.3, §4.5)', () => {
  it('books with a plan credit, no payment; the mentor is told; credit runs out', async () => {
    const { credit } = await session(hours(72), 'plan', 7);
    const [slot] = await freeSlots();
    const booked = await student.browser.post(`/api/me/packages/${credit!.id}/book`, {
      startAt: slot,
    });
    expect(booked.status).toBe(201);
    expect(
      (await t.prisma.packageCredit.findUniqueOrThrow({ where: { id: credit!.id } })).used,
    ).toBe(8);
    expect(await t.prisma.order.count()).toBe(0);

    const mentorBell = await bell(teacher);
    expect(mentorBell.items[0]).toMatchObject({
      type: 'session_booked',
      data: { audience: 'mentor', name: 'Test User', startAt: slot },
    });

    const [next] = await freeSlots();
    const none = await student.browser.post(`/api/me/packages/${credit!.id}/book`, {
      startAt: next,
    });
    expect(none.body.code).toBe('credit.none');

    const other = await createUser(t, { email: 'other@test.dev', roles: ['student'] });
    expect(
      (
        await (
          await signIn(t, other)
        ).post(`/api/me/packages/${credit!.id}/book`, { startAt: next })
      ).status,
    ).toBe(404);
  });

  it('cancelling in time returns the plan session; too late is refused', async () => {
    const { booking, credit } = await session(hours(48), 'plan', 2);
    expect((await student.browser.post(`/api/me/sessions/${booking.id}/cancel`, {})).status).toBe(
      204,
    );
    expect(
      (await t.prisma.packageCredit.findUniqueOrThrow({ where: { id: credit!.id } })).used,
    ).toBe(1);
    expect((await bell(teacher)).items[0]).toMatchObject({
      type: 'session_cancelled',
      data: { audience: 'mentor' },
    });

    const soon = await session(hours(5));
    const late = await student.browser.post(`/api/me/sessions/${soon.booking.id}/cancel`, {});
    expect(late.body.code).toBe('session.tooLate');
    const sessions = (await student.browser.get('/api/me/sessions')).body as {
      id: string;
      canChange: boolean;
    }[];
    expect(sessions.find((s) => s.id === soon.booking.id)?.canChange).toBe(false);
  });

  it('a paid single session cancelled in time asks for a refund', async () => {
    const { booking, order } = await session(hours(48), 'single');
    await student.browser.post(`/api/me/sessions/${booking.id}/cancel`, {});
    expect(
      (await t.prisma.order.findUniqueOrThrow({ where: { id: order!.id } })).refundRequestedAt,
    ).not.toBeNull();
    const past = (await student.browser.get('/api/me/sessions?scope=past')).body;
    expect(past[0]).toMatchObject({ status: 'cancelled', refundRequested: true });
  });

  it('reschedules only to a free time; the mentor sees the old and new time', async () => {
    const { booking } = await session(hours(72));
    const slots = await freeSlots();
    const target = slots.find(
      (slot) => Math.abs(Date.parse(slot) - booking.startAt.getTime()) > 4 * 3_600_000,
    )!;

    const taken = await student.browser.post(`/api/me/sessions/${booking.id}/reschedule`, {
      startAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    expect(taken.body.code).toBe('slot.unavailable');

    expect(
      (await student.browser.post(`/api/me/sessions/${booking.id}/reschedule`, { startAt: target }))
        .status,
    ).toBe(204);
    expect(
      (
        await t.prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })
      ).startAt.toISOString(),
    ).toBe(target);
    expect((await bell(teacher)).items[0]).toMatchObject({
      type: 'session_rescheduled',
      data: { startAt: target, previousStartAt: booking.startAt.toISOString() },
    });
  });

  it('allows one reschedule per session (SESSION_MAX_RESCHEDULES); cancelling stays open', async () => {
    const { booking } = await session(hours(72));
    const [first, second] = (await freeSlots()).filter(
      (slot) => Math.abs(Date.parse(slot) - booking.startAt.getTime()) > 4 * 3_600_000,
    );
    const listed = async () =>
      (
        (await student.browser.get('/api/me/sessions')).body as {
          id: string;
          canChange: boolean;
          canReschedule: boolean;
        }[]
      ).find((s) => s.id === booking.id);
    expect(await listed()).toMatchObject({ canChange: true, canReschedule: true });

    expect(
      (await student.browser.post(`/api/me/sessions/${booking.id}/reschedule`, { startAt: first }))
        .status,
    ).toBe(204);
    expect(await listed()).toMatchObject({ canChange: true, canReschedule: false });

    const again = await student.browser.post(`/api/me/sessions/${booking.id}/reschedule`, {
      startAt: second,
    });
    expect(again.body.code).toBe('session.rescheduleLimit');
    expect(
      (
        await t.prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })
      ).startAt.toISOString(),
    ).toBe(first);

    expect((await student.browser.post(`/api/me/sessions/${booking.id}/cancel`, {})).status).toBe(
      204,
    );
  });
});

describe('mentor: sessions, notes and cancelling', () => {
  it('lists upcoming sessions with their place in the plan, and past ones needing notes', async () => {
    await session(hours(30), 'plan', 5);
    await session(hours(-3));
    const sessions = (await teacher.get('/api/teach/sessions')).body;
    expect(sessions.upcoming).toHaveLength(1);
    expect(sessions.upcoming[0]).toMatchObject({
      student: { firstName: 'Test', lastName: 'User' },
      planPosition: { number: 1, total: 8 },
    });
    expect(sessions.needsNotes).toHaveLength(1);
  });

  it('records what happened; the student sees the notes and is told', async () => {
    const { booking } = await session(hours(-3));
    const empty = await teacher.post(`/api/teach/sessions/${booking.id}/outcome`, {
      outcome: 'held',
    });
    expect(empty.body.fieldErrors).toEqual({ notes: ['notes.required'] });

    const future = await session(hours(30));
    expect(
      (
        await teacher.post(`/api/teach/sessions/${future.booking.id}/outcome`, {
          outcome: 'no_show',
        })
      ).body.code,
    ).toBe('session.notStarted');

    expect(
      (
        await teacher.post(`/api/teach/sessions/${booking.id}/outcome`, {
          outcome: 'held',
          notes: 'Covered protected routes. Next: refresh tokens.',
        })
      ).status,
    ).toBe(204);
    const past = (await student.browser.get('/api/me/sessions?scope=past')).body;
    expect(past[0]).toMatchObject({
      status: 'completed',
      notes: 'Covered protected routes. Next: refresh tokens.',
    });
    expect((await bell(student.browser)).items[0]).toMatchObject({
      type: 'session_notes',
      data: { audience: 'student', name: 'Dania Hih' },
    });
    expect((await teacher.get('/api/teach/sessions')).body.needsNotes).toHaveLength(0);
  });

  it('the mentor cancels: the student keeps the session and is told', async () => {
    const { booking, credit } = await session(hours(10), 'plan', 3);
    expect((await teacher.post(`/api/teach/sessions/${booking.id}/cancel`, {})).status).toBe(204);
    expect(
      (await t.prisma.packageCredit.findUniqueOrThrow({ where: { id: credit!.id } })).used,
    ).toBe(2);
    expect((await bell(student.browser)).items[0]).toMatchObject({
      type: 'session_cancelled',
      data: { audience: 'student', name: 'Dania Hih' },
    });
  });
});
