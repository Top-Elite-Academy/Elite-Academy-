import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
const minutes = (n: number) => new Date(Date.now() + n * 60_000);

let mentorId: string;
let single: { id: string };
let plan: { id: string };

beforeEach(async () => {
  await t.reset();
  mentorId = (
    await t.prisma.mentorProfile.create({
      data: {
        slug: 'dania',
        kind: 'instructor',
        name: text('Dania Hih'),
        role: text('r'),
        bio: text('b'),
        languages: ['ar'],
      },
    })
  ).id;
  single = await t.prisma.package.create({
    data: { code: 'mentoring-1', kind: 'instructor', sessions: 1, priceAgorot: 25_000 },
  });
  plan = await t.prisma.package.create({
    data: { code: 'mentoring-8', kind: 'instructor', sessions: 8, priceAgorot: 200_000 },
  });
});

async function student(email = 'student@test.dev') {
  const user = await createUser(t, { email, roles: ['student'] });
  return { user, browser: await signIn(t, user) };
}

/** A booking with its order, as the booking flow would leave it. */
async function booking(
  userId: string,
  options: {
    startInMinutes: number;
    status: 'held' | 'confirmed' | 'cancelled' | 'completed';
    orderStatus?: 'pending' | 'paid' | 'failed';
    holdMinutesLeft?: number;
    zoomLink?: string;
    creditId?: string;
    packageId?: string;
  },
) {
  const order = options.orderStatus
    ? await t.prisma.order.create({
        data: {
          userId,
          items: [{ packageCode: 'mentoring-1', sessions: 1, priceAgorot: 25_000 }],
          amountAgorot: 25_000,
          provider: 'test',
          status: options.orderStatus,
          failureReason: options.orderStatus === 'failed' ? 'card_declined' : null,
        },
      })
    : null;
  return t.prisma.booking.create({
    data: {
      userId,
      mentorId,
      packageId: options.packageId ?? single.id,
      startAt: minutes(options.startInMinutes),
      endAt: minutes(options.startInMinutes + 60),
      status: options.status,
      holdExpiresAt:
        options.holdMinutesLeft === undefined ? null : minutes(options.holdMinutesLeft),
      zoomLink: options.zoomLink ?? null,
      orderId: order?.id ?? null,
      creditId: options.creditId ?? null,
    },
  });
}

describe('student area API (spec §4)', () => {
  it('is for signed-in students only', async () => {
    expect((await new Browser(t).get('/api/me/overview')).status).toBe(401);
    const sales = await createUser(t, {
      email: 'sales@test.dev',
      roles: ['sales'],
      withTotp: true,
    });
    expect((await (await signIn(t, sales)).get('/api/me/overview')).status).toBe(403);
  });

  it('lists only my real sessions; Join opens 15 minutes before the start', async () => {
    const { user, browser } = await student();
    const soon = await booking(user.id, {
      startInMinutes: 10,
      status: 'confirmed',
      orderStatus: 'paid',
      zoomLink: 'https://zoom.example/soon',
    });
    const later = await booking(user.id, {
      startInMinutes: 3 * 24 * 60,
      status: 'confirmed',
      orderStatus: 'paid',
      zoomLink: 'https://zoom.example/later',
    });
    const done = await booking(user.id, {
      startInMinutes: -24 * 60,
      status: 'confirmed',
      orderStatus: 'paid',
    });
    // Never shown: an unpaid hold, and a hold that was cancelled without paying.
    await booking(user.id, {
      startInMinutes: 120,
      status: 'held',
      orderStatus: 'pending',
      holdMinutesLeft: 5,
    });
    await booking(user.id, { startInMinutes: 180, status: 'cancelled', orderStatus: 'pending' });
    // Someone else's session.
    const other = await createUser(t, { email: 'other@test.dev', roles: ['student'] });
    await booking(other.id, { startInMinutes: 60, status: 'confirmed', orderStatus: 'paid' });

    const upcoming = (await browser.get('/api/me/sessions')).body as {
      id: string;
      joinUrl: string | null;
      mentor: { name: string };
    }[];
    expect(upcoming.map((s) => s.id)).toEqual([soon.id, later.id]);
    expect(upcoming[0]).toMatchObject({
      joinUrl: 'https://zoom.example/soon',
      mentor: { name: 'Dania Hih' },
    });
    expect(upcoming[1]!.joinUrl).toBeNull(); // link hidden until 15 minutes before

    const past = (await browser.get('/api/me/sessions?scope=past')).body as { id: string }[];
    expect(past.map((s) => s.id)).toEqual([done.id]);
    expect((await browser.get('/api/me/sessions?scope=everything')).status).toBe(400);
  });

  it('shows mentoring plan progress and the next session', async () => {
    const { user, browser } = await student();
    const credit = await t.prisma.packageCredit.create({
      data: { userId: user.id, packageId: plan.id, mentorId, total: 8, used: 3 },
    });
    const next = await booking(user.id, {
      startInMinutes: 48 * 60,
      status: 'confirmed',
      creditId: credit.id,
      packageId: plan.id,
    });

    const overview = (await browser.get('/api/me/overview')).body;
    expect(overview.packages).toEqual([
      {
        id: credit.id,
        service: 'mentoring-8',
        mentor: { id: mentorId, name: 'Dania Hih' },
        total: 8,
        used: 3,
        nextSessionAt: next.startAt.toISOString(),
        canBook: true,
      },
    ]);
    expect(overview.upcoming).toHaveLength(1);
  });

  it('lists orders without unfinished checkouts; a failed one can be retried while held', async () => {
    const { user, browser } = await student();
    await booking(user.id, { startInMinutes: 300, status: 'confirmed', orderStatus: 'paid' });
    const failed = await booking(user.id, {
      startInMinutes: 400,
      status: 'held',
      orderStatus: 'failed',
      holdMinutesLeft: 8,
    });
    await booking(user.id, {
      startInMinutes: 500,
      status: 'held',
      orderStatus: 'pending',
      holdMinutesLeft: 9,
    });

    const orders = (await browser.get('/api/me/orders')).body as {
      status: string;
      retryBookingId: string | null;
      failureReason: string | null;
      amountAgorot: number;
    }[];
    expect(orders.map((o) => o.status).sort()).toEqual(['failed', 'paid']);
    const failedOrder = orders.find((o) => o.status === 'failed')!;
    expect(failedOrder).toMatchObject({
      retryBookingId: failed.id,
      failureReason: 'card_declined',
      amountAgorot: 25_000,
    });
    expect(JSON.stringify(orders)).not.toMatch(/card_?number|cvv|pan/i);
  });
});
