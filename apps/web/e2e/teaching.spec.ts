import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

const COHORT = 'c0000000-0000-4000-8000-000000000003';

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

const notification = (id: string, type: string, data: object) => ({
  id,
  type,
  data,
  readAt: null,
  createdAt: new Date().toISOString(),
});

/** One unread notification now; a new announcement arrives on the live stream 1.5 s later. */
async function mockBell(page: Page) {
  await page.route(
    (url) => url.pathname === '/api/notifications',
    (route) =>
      route.fulfill({
        json: {
          items: [
            notification('n1', 'enrollment_confirmed', {
              cohortId: COHORT,
              cohortName: 'FSA-03',
              programTitle: 'Full Stack Advanced with AI',
            }),
          ],
          unread: 1,
        },
      }),
  );
  await page.route(
    (url) => url.pathname === '/api/notifications/stream',
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const live = notification('n2', 'announcement', {
        cohortId: COHORT,
        cohortName: 'FSA-03',
        title: 'Class moved to 19:00',
        announcementId: 'a2',
      });
      await route.fulfill({
        headers: { 'content-type': 'text/event-stream' },
        body: `retry: 600000\n\ndata: ${JSON.stringify({ kind: 'notification', notification: live })}\n\n`,
      });
    },
  );
}

async function mockCsrf(page: Page) {
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'x'.repeat(43) } }),
  );
}

test.describe('instructor area (designs "Instructor 1–2")', () => {
  test('Today: greeting, week, numbers, schedule and announcements', async ({ page }) => {
    await signInAs(page, 'instructor');
    await page.goto('/en/teach');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /^Good (morning|afternoon|evening), Dania$/,
    );
    await expect(page.getByText(/FSA-03 is in week 12 of 24/)).toBeVisible();

    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByRole('link', { name: 'Today' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(
      sidebar.getByRole('link', { name: /FSA-03 · Full Stack Advanced with AI/ }),
    ).toBeVisible();
    await expect(page.getByText('1 waiting for confirmation')).toBeVisible();

    const schedule = page.getByRole('region', { name: 'Today’s schedule' });
    await expect(schedule).toContainText('Live class');
    await expect(schedule).toContainText('Tomorrow');
    await expect(schedule.getByRole('link', { name: 'Open cohort' })).toHaveAttribute(
      'href',
      `/en/teach/cohorts/${COHORT}`,
    );
    await expect(page.getByRole('region', { name: 'Latest announcements' })).toContainText(
      'Week 12 materials are up',
    );
  });

  test('Post announcement: checks the form, sends title and message to the chosen cohort', async ({
    page,
  }) => {
    await signInAs(page, 'instructor');
    await mockCsrf(page);
    const posted: { url: string; body: unknown }[] = [];
    await page.route('**/api/teach/cohorts/*/announcements', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      posted.push({ url: route.request().url(), body: route.request().postDataJSON() });
      await route.fulfill({ status: 201, json: {} });
    });

    await page.goto('/en/teach');
    await page.getByRole('button', { name: 'Post announcement' }).click();
    const dialog = page.getByRole('dialog', { name: 'Post an announcement' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Post announcement' }).click();
    await expect(dialog.getByText('Write a title.')).toBeVisible();
    expect(posted).toHaveLength(0);

    await dialog.getByLabel('Title').fill('Class moved to 19:00');
    await dialog.getByLabel('Message').fill('Wednesday’s class starts an hour later.');
    await dialog.getByRole('button', { name: 'Post announcement' }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole('status').filter({ hasText: 'Announcement posted.' }),
    ).toBeVisible();
    expect(posted[0]?.url).toContain(`/api/teach/cohorts/${COHORT}/announcements`);
    expect(posted[0]?.body).toEqual({
      title: 'Class moved to 19:00',
      body: 'Wednesday’s class starts an hour later.',
    });
  });

  test('cohort page: students with status filters and search', async ({ page }) => {
    await signInAs(page, 'instructor');
    await page.goto(`/en/teach/cohorts/${COHORT}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Full Stack Advanced with AI · FSA-03',
    );
    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(5); // header + 4

    await page.getByRole('button', { name: /Pending/ }).click();
    await expect(page.getByRole('button', { name: /Pending/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1)).toContainText('Nour Abbas');

    await page.getByRole('button', { name: /All/ }).click();
    await page.getByRole('searchbox', { name: 'Search students' }).fill('lina');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1)).toContainText('Lina Hamdan');
  });

  test('each area is for its own role', async ({ page }) => {
    await signInAs(page, 'instructor');
    await page.goto('/en/app');
    await expect(page).toHaveURL(/\/en\/teach$/);

    await page.context().clearCookies();
    await signInAs(page, 'student');
    const response = await page.goto('/en/teach');
    expect(response?.status()).toBe(404);
  });

  test('phones: the instructor links sit under the top bar @mobile', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'phone layout only');
    await signInAs(page, 'instructor');
    await page.goto('/en/teach');
    await expect(page.getByRole('complementary')).toBeHidden();
    await page.getByRole('banner').getByRole('link', { name: 'My cohorts' }).click();
    await expect(page).toHaveURL(/\/en\/teach\/cohorts$/);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('student side: class, joining and live notifications', () => {
  test('the bell shows new announcements live and can mark them read', async ({ page }) => {
    await signInAs(page, 'student');
    await mockCsrf(page);
    await mockBell(page);
    await page.route('**/api/notifications/read', (route) =>
      route.fulfill({ status: 204, body: '' }),
    );
    await page.goto('/en/app');

    const bell = page.getByRole('button', { name: /^Notifications/ });
    await expect(bell).toHaveAccessibleName('Notifications, 1 unread notification');
    // The mock stream sends "Class moved to 19:00" a moment after the page opens.
    await expect(bell).toHaveAccessibleName('Notifications, 2 unread notifications');
    await expect(page.getByRole('status').filter({ hasText: 'New notification' })).toHaveText(
      'New notification: FSA-03: Class moved to 19:00',
    );

    await bell.click();
    const panel = page.getByRole('region', { name: 'Notifications' });
    await expect(panel).toContainText('FSA-03: Class moved to 19:00');
    await expect(panel).toContainText('You’re confirmed in Full Stack Advanced with AI (FSA-03)');
    await panel.getByRole('button', { name: 'Mark all as read' }).click();
    await expect(bell).toHaveAccessibleName('Notifications, No unread notifications');
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(bell).toBeFocused();
  });

  test('My courses: the confirmed class with announcements, and asking to join another', async ({
    page,
  }) => {
    await signInAs(page, 'student');
    await mockCsrf(page);
    const joined: unknown[] = [];
    await page.route('**/api/me/enrollments', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      joined.push(route.request().postDataJSON());
      await route.fulfill({ status: 201, json: {} });
    });
    await page.goto('/en/app/courses');
    const course = page.getByRole('main').getByRole('article').first();
    await expect(course).toContainText('Full Stack Advanced with AI · FSA-03');
    await expect(course).toContainText('Confirmed');
    await expect(course).toContainText('Week 12 materials are up');

    await page.getByRole('combobox', { name: 'Cohort' }).selectOption({ index: 0 });
    await page.getByRole('button', { name: 'Ask to join' }).click();
    await expect(page.getByText('Request sent. We’ll confirm your place soon.')).toBeVisible();
    expect(joined).toEqual([{ cohortId: 'c0000000-0000-4000-8000-000000000004' }]);
  });

  test('has no automatically detectable accessibility issues (en, ar, he)', async ({ page }) => {
    await signInAs(page, 'instructor');
    for (const path of ['/en/teach', `/ar/teach/cohorts/${COHORT}`, '/he/teach/cohorts']) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
    await page.goto('/en/teach');
    await page.getByRole('button', { name: 'Post announcement' }).click();
    await expectNoA11yViolations(page);

    await page.context().clearCookies();
    await signInAs(page, 'student');
    await page.goto('/en/app/courses');
    await page.getByRole('button', { name: /^Notifications/ }).click();
    await expectNoA11yViolations(page);
  });
});
