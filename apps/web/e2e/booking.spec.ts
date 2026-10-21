import type { Locator, Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

const RANA = '11111111-1111-4111-8111-111111111111';
const BOOKING = 'b0000000-0000-4000-8000-000000000001';
const START = `/en/book?service=mentoring-8&mentor=${RANA}`;

/** Free times tomorrow and the day after, in the future whatever the clock says. */
function freeSlots() {
  const day = (offset: number, hourUtc: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offset);
    date.setUTCHours(hourUtc, 0, 0, 0);
    return date;
  };
  return [day(1, 7), day(1, 8), day(2, 7)].map((start) => ({
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + 3_600_000).toISOString(),
  }));
}

const bookingView = (status: string, paymentStatus: string | null, extra = {}) => ({
  id: BOOKING,
  status,
  paymentStatus,
  failureReason: null,
  service: 'mentoring-8',
  sessions: 8,
  sessionMinutes: 60,
  mentor: { id: RANA, name: 'Rana Arafat' },
  startAt: freeSlots()[0]!.startAt,
  endAt: freeSlots()[0]!.endAt,
  amountAgorot: 200_000,
  holdExpiresAt: new Date(Date.now() + 600_000).toISOString(),
  creditsLeft: null,
  ...extra,
});

/** Browser-side API: slots, hold, checkout, the booking itself and the test payment. */
async function mockBookingApi(page: Page) {
  const holds: Record<string, unknown>[] = [];
  let view = bookingView('held', 'pending');

  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'x'.repeat(43) } }),
  );
  await page.route(
    (url) => url.pathname === '/api/booking/slots',
    (route) => route.fulfill({ json: freeSlots() }),
  );
  await page.route('**/api/bookings/hold', async (route) => {
    holds.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 201, json: { bookingId: BOOKING, holdExpiresAt: '' } });
  });
  await page.route(`**/api/bookings/${BOOKING}/checkout`, (route) =>
    route.fulfill({ json: { redirectUrl: `/en/book/test-checkout?booking=${BOOKING}` } }),
  );
  await page.route(`**/api/bookings/${BOOKING}`, (route) => route.fulfill({ json: view }));
  await page.route(`**/api/bookings/${BOOKING}/test-payment`, async (route) => {
    const { outcome } = route.request().postDataJSON() as { outcome: string };
    view =
      outcome === 'paid'
        ? bookingView('confirmed', 'paid', { creditsLeft: 7 })
        : bookingView('held', 'failed', { failureReason: 'card_declined' });
    await route.fulfill({ status: 202, body: '' });
  });
  return holds;
}

async function signIn(page: Page) {
  await page
    .context()
    .addCookies([{ name: 'mock_session', value: '1', domain: 'localhost', path: '/' }]);
}

/** Options are cards: the visitor clicks the card (the radio's label), as with a mouse. */
async function choose(radio: Locator) {
  await radio.locator('xpath=ancestor::label').click();
  await expect(radio).toBeChecked();
}

async function chooseFirstTime(page: Page) {
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose a date and time');
  await choose(page.getByRole('group', { name: 'Available times' }).getByRole('radio').first());
  await page.getByRole('button', { name: 'Continue to review' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your booking');
}

test.describe('booking flow (spec §3.7)', () => {
  test('step 1: the service and mentor from the link are preselected, prices from the API', async ({
    page,
  }) => {
    await page.goto(START);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'What would you like to book?',
    );
    await expect(page.getByText('Secure booking')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Mentoring plan · 8 sessions/ })).toBeChecked();
    await expect(page.getByRole('radio', { name: /Rana Arafat/ })).toBeChecked();
    await expect(page.getByRole('radio', { name: /CV review.*₪250/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /mock interview.*₪300/ })).toBeVisible();

    const summary = page.getByRole('complementary', { name: 'Booking summary' });
    await expect(summary).toContainText('Rana Arafat');
    await expect(summary).toContainText('60 minutes');
    await expect(summary).toContainText('Jerusalem time');
    await expect(summary).toContainText('₪2,000');
    await expect(page.getByRole('navigation', { name: 'Booking steps' })).toContainText('Service');

    // Another kind of service needs another mentor.
    await choose(page.getByRole('radio', { name: /CV review/ }));
    await expect(summary).toContainText('₪250');
    await expect(summary).toContainText('45 minutes');
    await expect(page.getByText('No mentors are available for this service yet.')).toBeVisible();
  });

  test('asks for a mentor before moving on; old career links still work', async ({ page }) => {
    await page.goto('/en/book?service=career');
    await expect(page.getByRole('radio', { name: /CV review/ })).toBeChecked();
    await choose(page.getByRole('radio', { name: /Mentoring plan/ }));
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Choose a mentor' })).toBeVisible();
  });

  test('signed out: the review step asks to sign in and comes back with the same choice', async ({
    page,
  }) => {
    await mockBookingApi(page);
    await page.goto(START);
    await chooseFirstTime(page);

    await expect(page.getByRole('heading', { name: 'Sign in to pay' })).toBeVisible();
    const next = new URL(
      (await page.getByRole('link', { name: 'Create an account' }).getAttribute('href'))!,
      'http://x',
    ).searchParams.get('next');
    expect(next).toMatch(/^\/book\?service=mentoring-8&mentor=.+&at=.+&step=review$/);
    await expect(page.getByRole('button', { name: /^Pay/ })).toHaveCount(0);

    // The browser's Back button returns to the previous step.
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose a date and time');
  });

  test('signed in: agree, pay on the test page, see the confirmation', async ({ page }) => {
    const holds = await mockBookingApi(page);
    await signIn(page);
    await page.goto(START);
    await chooseFirstTime(page);

    const pay = page.getByRole('button', { name: 'Pay ₪2,000 now' });
    await pay.click();
    await expect(
      page.getByText('Please agree to the cancellation policy and terms.'),
    ).toBeVisible();
    expect(holds).toHaveLength(0);

    await page.getByLabel('I agree to the cancellation policy and the terms of use.').check();
    await pay.click();
    await expect(page.getByRole('heading', { name: 'Test payment page' })).toBeVisible();
    // Only ids go to the server: the price is looked up there.
    expect(holds[0]).toMatchObject({ service: 'mentoring-8', mentorId: RANA, agreeToTerms: true });
    expect(holds[0]).not.toHaveProperty('priceAgorot');

    // The amount is loaded in the browser: once it shows, the page is ready for clicks.
    await expect(page.getByText('₪2,000')).toBeVisible();
    await page.getByRole('button', { name: 'Simulate successful payment' }).click();
    await expect(page.getByRole('heading', { name: 'Your booking is confirmed' })).toBeVisible();
    await expect(page.getByText('You have 7 more sessions in your plan.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add to calendar' })).toHaveAttribute(
      'href',
      `/api/bookings/${BOOKING}/calendar.ics`,
    );
    await expect(page.getByRole('link', { name: 'Go to my dashboard' })).toHaveAttribute(
      'href',
      '/en/app',
    );
  });

  test('a declined card shows the reason and offers to pay again', async ({ page }) => {
    await mockBookingApi(page);
    await signIn(page);
    await page.goto(`/en/book/test-checkout?booking=${BOOKING}`);
    await expect(page.getByText('₪2,000')).toBeVisible();
    await page.getByRole('button', { name: 'Simulate declined card' }).click();
    await expect(
      page.getByRole('heading', { name: 'The payment did not go through' }),
    ).toBeVisible();
    await expect(page.getByText('the card was declined')).toBeVisible();
    await page.getByRole('button', { name: 'Try payment again' }).click();
    await expect(page.getByRole('heading', { name: 'Test payment page' })).toBeVisible();
  });

  test('confirmation and payment pages need sign-in', async ({ page }) => {
    await page.goto(`/en/book/confirmation?booking=${BOOKING}`);
    await expect(page).toHaveURL(/\/en\/login\?next=/);
  });

  test('phones: the main action is fixed to the bottom of the screen @mobile', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'phone layout only');
    await page.goto(START);
    const bar = page.locator('.fixed.bottom-0');
    await expect(bar.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
    await expect(bar).toContainText('₪2,000');
  });

  test('has no automatically detectable accessibility issues (en, ar)', async ({ page }) => {
    await mockBookingApi(page);
    await signIn(page);
    for (const locale of ['en', 'ar']) {
      await page.goto(`/${locale}/book?service=mentoring-8&mentor=${RANA}`);
      await expectNoA11yViolations(page);
    }
    await page.goto(START);
    await chooseFirstTime(page);
    await expectNoA11yViolations(page);
  });
});

test.describe('sign-up (spec §3.7)', () => {
  test('the login page links to sign-up and keeps where to go next', async ({ page }) => {
    await page.goto('/en/login?next=%2Fbook%3Fservice%3Dcareer-cv');
    await page.getByRole('link', { name: 'New here? Create an account' }).click();
    await expect(page).toHaveURL(/\/en\/signup\?next=%2Fbook%3Fservice%3Dcareer-cv$/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'new-password');
    await expectNoA11yViolations(page);
  });
});
