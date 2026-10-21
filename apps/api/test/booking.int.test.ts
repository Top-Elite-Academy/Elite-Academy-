import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Browser, createUser, signIn, WEB_ORIGIN } from './helpers/browser';
import { createTestApp, type TestApp, VALID_CAPTCHA } from './helpers/test-app';

let t: TestApp;
let mentorId: string;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

const text = (en: string) => ({ en, ar: en, he: en });

beforeEach(async () => {
  await t.reset();
  const mentor = await t.prisma.mentorProfile.create({
    data: {
      slug: 'dania',
      kind: 'instructor',
      name: text('Dania'),
      role: text('r'),
      bio: text('b'),
      languages: ['ar'],
    },
  });
  mentorId = mentor.id;
  // Free every day 08:00–22:00 Jerusalem time.
  await t.prisma.availabilitySlot.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      mentorId,
      weekday,
      startTime: '08:00',
      endTime: '22:00',
    })),
  });
  await t.prisma.package.createMany({
    data: [
      { code: 'mentoring-1', kind: 'instructor', sessions: 1, priceAgorot: 25_000 },
      {
        code: 'mentoring-8',
        kind: 'instructor',
        sessions: 8,
        priceAgorot: 200_000,
        recommended: true,
      },
    ],
  });
});

async function student(email = 'student@test.dev') {
  const user = await createUser(t, { email, roles: ['student'] });
  return { user, browser: await signIn(t, user) };
}

async function firstSlot(service = 'mentoring-1'): Promise<string> {
  const response = await new Browser(t).get(
    `/api/booking/slots?mentorId=${mentorId}&service=${service}`,
  );
  expect(response.status).toBe(200);
  return (response.body as { startAt: string }[])[0]!.startAt;
}

const holdBody = (startAt: string, service = 'mentoring-1') => ({
  service,
  mentorId,
  startAt,
  agreeToTerms: true,
  locale: 'en',
});

function signedWebhook(body: object) {
  const raw = JSON.stringify(body);
  const signature = createHmac('sha256', process.env['PAYMENT_TEST_SECRET']!)
    .update(raw)
    .digest('hex');
  return request(t.app.getHttpServer())
    .post('/api/payments/webhooks/test')
    .set('Content-Type', 'application/json')
    .set('x-test-signature', signature)
    .send(raw);
}

describe('slots (spec §3.7 step 2)', () => {
  it('offers only future sessions of the package length within 14 days', async () => {
    const response = await new Browser(t).get(
      `/api/booking/slots?mentorId=${mentorId}&service=mentoring-1`,
    );
    const slots = response.body as { startAt: string; endAt: string }[];
    expect(slots.length).toBeGreaterThan(50);
    const first = slots[0]!;
    expect(new Date(first.endAt).getTime() - new Date(first.startAt).getTime()).toBe(60 * 60_000);
    expect(new Date(first.startAt).getTime()).toBeGreaterThan(Date.now() + 3 * 3600_000 - 1);
    const last = slots.at(-1)!;
    expect(new Date(last.startAt).getTime()).toBeLessThan(Date.now() + 15 * 24 * 3600_000);
  });

  it('rejects an unknown service or a mentor of the wrong kind', async () => {
    const browser = new Browser(t);
    expect(
      (await browser.get(`/api/booking/slots?mentorId=${mentorId}&service=nope`)).body.code,
    ).toBe('service.invalid');
    const advisor = await t.prisma.mentorProfile.create({
      data: {
        slug: 'noa',
        kind: 'career',
        name: text('Noa'),
        role: text('r'),
        bio: text('b'),
        languages: [],
      },
    });
    expect(
      (await browser.get(`/api/booking/slots?mentorId=${advisor.id}&service=mentoring-1`)).body
        .code,
    ).toBe('mentor.invalid');
  });
});

describe('hold (spec §3.7 steps 3–4)', () => {
  it('requires sign-in and agreeing to the terms', async () => {
    const startAt = await firstSlot();
    const anonymous = await new Browser(t).open();
    expect((await anonymous.post('/api/bookings/hold', holdBody(startAt))).status).toBe(401);

    const { browser } = await student();
    const noTerms = await browser.post('/api/bookings/hold', {
      ...holdBody(startAt),
      agreeToTerms: false,
    });
    expect(noTerms.body.fieldErrors).toEqual({ agreeToTerms: ['terms.required'] });
  });

  it('holds the slot for 10 minutes with the price from the database, never from the browser', async () => {
    const startAt = await firstSlot();
    const { user, browser } = await student();
    const response = await browser.post('/api/bookings/hold', {
      ...holdBody(startAt),
      priceAgorot: 1,
    });
    expect(response.status).toBe(201);

    const booking = await t.prisma.booking.findUniqueOrThrow({
      where: { id: response.body.bookingId },
      include: { order: true },
    });
    expect(booking).toMatchObject({ status: 'held', userId: user.id });
    expect(booking.order).toMatchObject({
      amountAgorot: 25_000,
      status: 'pending',
      provider: 'test',
    });
    const minutesLeft = (booking.holdExpiresAt!.getTime() - Date.now()) / 60_000;
    expect(minutesLeft).toBeGreaterThan(9.9);
    expect(minutesLeft).toBeLessThanOrEqual(10);
    expect(await t.prisma.consent.count({ where: { userId: user.id, type: 'terms' } })).toBe(1);

    // The held slot is no longer offered, and nobody else can take it.
    expect(await firstSlot()).not.toBe(startAt);
    const other = await student('other@test.dev');
    const clash = await other.browser.post('/api/bookings/hold', holdBody(startAt));
    expect(clash.status).toBe(409);
    expect(clash.body.code).toBe('slot.unavailable');
  });

  it('frees a slot whose hold expired', async () => {
    const startAt = await firstSlot();
    const { browser } = await student();
    const { bookingId } = (await browser.post('/api/bookings/hold', holdBody(startAt))).body;
    await t.prisma.booking.update({
      where: { id: bookingId },
      data: { holdExpiresAt: new Date(Date.now() - 1000) },
    });

    expect(await firstSlot()).toBe(startAt);
    const checkout = await browser.post(`/api/bookings/${bookingId}/checkout`, { locale: 'en' });
    expect(checkout.body.code).toBe('booking.holdExpired');
    const other = await student('other@test.dev');
    expect((await other.browser.post('/api/bookings/hold', holdBody(startAt))).status).toBe(201);
  });
});

describe('payment (spec §3.7 steps 4–5, §9.5)', () => {
  async function heldBooking(service = 'mentoring-1') {
    const startAt = await firstSlot(service);
    const { browser } = await student();
    const { bookingId } = (await browser.post('/api/bookings/hold', holdBody(startAt, service)))
      .body;
    const booking = await t.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { order: true },
    });
    return { browser, bookingId: bookingId as string, order: booking.order! };
  }

  it('sends the booker to the hosted payment page', async () => {
    const { browser, bookingId } = await heldBooking();
    const response = await browser.post(`/api/bookings/${bookingId}/checkout`, { locale: 'he' });
    expect(response.body.redirectUrl).toBe(
      `${WEB_ORIGIN}/he/book/test-checkout?booking=${bookingId}`,
    );
  });

  it('confirms only from a signed webhook; the same event twice does nothing', async () => {
    const { browser, bookingId, order } = await heldBooking('mentoring-8');
    const event = {
      eventId: randomUUID(),
      orderId: order.id,
      outcome: 'paid',
      amountAgorot: 200_000,
      currency: 'ILS',
      providerTxnId: 'txn-1',
    };

    const forged = await request(t.app.getHttpServer())
      .post('/api/payments/webhooks/test')
      .set('Content-Type', 'application/json')
      .set('x-test-signature', 'not-a-real-signature')
      .send(JSON.stringify(event));
    expect(forged.status).toBe(400);
    expect((await t.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      'pending',
    );

    expect((await signedWebhook(event)).status).toBe(200);
    expect((await signedWebhook(event)).status).toBe(200); // replay

    const view = await browser.get(`/api/bookings/${bookingId}`);
    expect(view.body).toMatchObject({ status: 'confirmed', paymentStatus: 'paid', creditsLeft: 7 });
    expect(await t.prisma.packageCredit.count()).toBe(1);
    expect(t.mail.sent.map((m) => m.template)).toEqual(['bookingConfirmed']);

    const ics = await browser.get(`/api/bookings/${bookingId}/calendar.ics`);
    expect(ics.headers['content-type']).toContain('text/calendar');
    expect(ics.text).toContain('BEGIN:VEVENT');
  });

  it('rejects a webhook whose amount does not match the order', async () => {
    const { order } = await heldBooking();
    const response = await signedWebhook({
      eventId: randomUUID(),
      orderId: order.id,
      outcome: 'paid',
      amountAgorot: 100,
      currency: 'ILS',
      providerTxnId: 'txn-2',
    });
    expect(response.body.code).toBe('payment.amountMismatch');
    expect((await t.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      'pending',
    );
  });

  it('a failed payment keeps the hold so the booker can try again', async () => {
    const { browser, bookingId } = await heldBooking();
    await browser.post(`/api/bookings/${bookingId}/test-payment`, { outcome: 'failed' });

    const view = await browser.get(`/api/bookings/${bookingId}`);
    expect(view.body).toMatchObject({
      status: 'held',
      paymentStatus: 'failed',
      failureReason: 'card_declined',
    });
    const retry = await browser.post(`/api/bookings/${bookingId}/checkout`, { locale: 'en' });
    expect(retry.status).toBe(200);
    await browser.post(`/api/bookings/${bookingId}/test-payment`, { outcome: 'paid' });
    expect((await browser.get(`/api/bookings/${bookingId}`)).body.status).toBe('confirmed');
  });

  it("hides other people's bookings (404)", async () => {
    const { bookingId } = await heldBooking();
    const other = await student('other@test.dev');
    expect((await other.browser.get(`/api/bookings/${bookingId}`)).status).toBe(404);
    expect(
      (await other.browser.post(`/api/bookings/${bookingId}/test-payment`, { outcome: 'paid' }))
        .status,
    ).toBe(404);
  });
});

describe('example mentors', () => {
  it('cannot be booked when example content is off', async () => {
    await t.prisma.mentorProfile.update({ where: { id: mentorId }, data: { isExample: true } });
    const response = await new Browser(t).get(
      `/api/booking/slots?mentorId=${mentorId}&service=mentoring-1`,
    );
    expect(response.body.code).toBe('mentor.invalid');
  });
});

describe('POST /api/auth/signup (spec §3.7: account creation before payment)', () => {
  const signup = {
    firstName: 'Maya',
    lastName: 'Rizk',
    email: 'maya@test.dev',
    password: 'a-long-password-123',
    locale: 'he',
    captchaToken: VALID_CAPTCHA,
  };

  it('creates a signed-in student', async () => {
    const browser = await new Browser(t).open();
    const response = await browser.post('/api/auth/signup', signup);
    expect(response.status).toBe(201);
    const me = await browser.get('/api/users/me');
    expect(me.body).toMatchObject({ email: 'maya@test.dev', roles: ['student'], locale: 'he' });
  });

  it('requires the captcha and refuses a used email', async () => {
    const browser = await new Browser(t).open();
    expect(
      (await browser.post('/api/auth/signup', { ...signup, captchaToken: 'x' })).body.code,
    ).toBe('captcha.required');
    await browser.post('/api/auth/signup', signup);
    expect((await (await new Browser(t).open()).post('/api/auth/signup', signup)).body.code).toBe(
      'user.exists',
    );
  });
});
