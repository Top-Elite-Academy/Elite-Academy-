import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

const PLAN = 'f0000000-0000-4000-8000-000000000001';

async function signInAs(page: Page, who: 'student' | 'instructor') {
  await page.context().addCookies([
    {
      name: 'mock_session',
      value: who === 'instructor' ? 'instructor' : '1',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

/** Browser-side calls: CSRF plus capturing what the page sends. */
async function captureApi(page: Page) {
  const sent: { method: string; path: string; body: unknown }[] = [];
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'x'.repeat(43) } }),
  );
  await page.route(
    (url) => /^\/api\/(teach|me)\//.test(url.pathname),
    async (route) => {
      const request = route.request();
      if (request.method() === 'GET') return route.fallback();
      sent.push({
        method: request.method(),
        path: new URL(request.url()).pathname,
        body: request.postData() ? request.postDataJSON() : null,
      });
      await route.fulfill(
        request.method() === 'PUT'
          ? { json: {} }
          : { status: request.url().includes('/book') ? 201 : 204, body: '' },
      );
    },
  );
  return sent;
}

test.describe('instructor: Sessions & availability (design "Instructor 5")', () => {
  test('upcoming sessions show the plan position; cancelling asks first', async ({ page }) => {
    await signInAs(page, 'instructor');
    const sent = await captureApi(page);
    await page.goto('/en/teach/sessions');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sessions & availability');

    const upcoming = page.getByRole('region', { name: 'Upcoming sessions' });
    await expect(upcoming).toContainText('Mentoring 5 of 8');
    await expect(upcoming).toContainText('Maya Rizk');

    await upcoming.getByRole('button', { name: /^Cancel/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Cancel this session?' });
    await expect(dialog).toContainText('Maya Rizk keeps the session');
    await dialog.getByRole('button', { name: 'Cancel session' }).click();
    await expect(dialog).toBeHidden();
    expect(sent).toContainEqual({
      method: 'POST',
      path: '/api/teach/sessions/m0000000-0000-4000-8000-000000000001/cancel',
      body: {},
    });
  });

  test('notes after a session: required when held, then saved', async ({ page }) => {
    await signInAs(page, 'instructor');
    const sent = await captureApi(page);
    await page.goto('/en/teach/sessions');
    const notes = page.getByRole('region', { name: 'Notes for past sessions' });
    await expect(notes).toContainText('Sara Mansour');
    await expect(notes).toContainText('1 missing');

    await notes.getByRole('button', { name: 'Save session notes' }).click();
    await expect(notes.getByText('Write what you covered — the student sees it.')).toBeVisible();

    await notes.getByLabel('What did you cover? (the student sees this)').fill('Prisma relations.');
    await notes.getByRole('button', { name: 'Save session notes' }).click();
    await expect
      .poll(() => sent.find((call) => call.path.endsWith('/outcome'))?.body)
      .toEqual({ outcome: 'held', notes: 'Prisma relations.' });
  });

  test('weekly grid: open an hour, live classes are locked, save hours and settings', async ({
    page,
  }) => {
    await signInAs(page, 'instructor');
    const sent = await captureApi(page);
    await page.goto('/en/teach/sessions');

    const monday10 = page.getByRole('button', { name: 'Mon 10:00: Closed' });
    await monday10.click();
    await expect(page.getByRole('button', { name: 'Mon 10:00: Open for booking' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Live class hours are not buttons.
    await expect(page.getByRole('button', { name: /^Sun 18:00/ })).toHaveCount(0);
    await expect(page.getByText('Sun 18:00: Live class')).toBeAttached();
    await expect(page.getByText('5 hours open each week')).toBeVisible();

    await page.getByLabel('Break between sessions').selectOption('30');
    await page.getByRole('button', { name: 'Save availability' }).click();
    await expect(page.getByText('Availability saved.')).toBeVisible();
    expect(sent.find((call) => call.method === 'PUT')?.body).toEqual({
      windows: [
        { weekday: 1, startTime: '10:00', endTime: '11:00' },
        { weekday: 1, startTime: '16:00', endTime: '18:00' },
        { weekday: 4, startTime: '16:00', endTime: '18:00' },
      ],
      breakMinutes: 30,
      minNoticeHours: 24,
    });
  });
});

test.describe('student: changing sessions and booking the next meeting', () => {
  test('reschedule and cancel until 24 hours before; past sessions show the notes', async ({
    page,
  }) => {
    await signInAs(page, 'student');
    const sent = await captureApi(page);
    await page.goto('/en/app/sessions');
    const [soon, later] = await page.getByRole('main').getByRole('article').all();
    await expect(soon!).toContainText('Changes are possible until 24 hours before the session.');
    await expect(later!.getByRole('link', { name: /^Reschedule/ })).toHaveAttribute(
      'href',
      '/en/app/sessions/s0000000-0000-4000-8000-000000000002/reschedule',
    );

    await later!.getByRole('button', { name: /^Cancel/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Cancel this session?' });
    await expect(dialog).toContainText('The session goes back to your plan');
    await dialog.getByRole('button', { name: 'Cancel session' }).click();
    await expect(dialog).toBeHidden();
    expect(sent.map((call) => call.path)).toContain(
      '/api/me/sessions/s0000000-0000-4000-8000-000000000002/cancel',
    );

    await page.getByRole('link', { name: 'Past' }).click();
    await expect(page.getByRole('main')).toContainText('Notes from Rana Arafat');
    await expect(page.getByRole('main')).toContainText('Covered protected routes.');
  });

  test('book the next meeting from the plan: pick a time, no payment', async ({ page }) => {
    await signInAs(page, 'student');
    const sent = await captureApi(page);
    const slot = new Date(Date.now() + 3 * 86_400_000);
    slot.setUTCHours(14, 0, 0, 0);
    await page.route(
      (url) => url.pathname === '/api/booking/slots',
      (route) =>
        route.fulfill({
          json: [
            {
              startAt: slot.toISOString(),
              endAt: new Date(slot.getTime() + 3_600_000).toISOString(),
            },
          ],
        }),
    );

    await page.goto('/en/app');
    await page.getByRole('link', { name: 'Book the next meeting' }).click();
    await expect(page).toHaveURL(new RegExp(`/en/app/sessions/book\\?plan=${PLAN}$`));
    await expect(page.getByRole('main')).toContainText('No payment needed.');

    await page.getByRole('button', { name: 'Book this time' }).click();
    await expect(page.getByText('Choose a time first.')).toBeVisible();

    const time = page.getByRole('group', { name: 'Available times' }).getByRole('radio').first();
    await time.locator('xpath=ancestor::label').click();
    await page.getByRole('button', { name: 'Book this time' }).click();
    await expect(page).toHaveURL(/\/en\/app\/sessions\?done=booked$/);
    await expect(page.getByText('Your meeting is booked.')).toBeVisible();
    expect(sent).toContainEqual({
      method: 'POST',
      path: `/api/me/packages/${PLAN}/book`,
      body: { startAt: slot.toISOString() },
    });
  });

  test('has no automatically detectable accessibility issues', async ({ page }) => {
    await signInAs(page, 'instructor');
    for (const path of ['/en/teach/sessions', '/ar/teach/sessions']) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
    await page.context().clearCookies();
    await signInAs(page, 'student');
    for (const path of ['/en/app/sessions', '/he/app/sessions?tab=past']) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});
