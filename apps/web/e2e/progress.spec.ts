import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

const COHORT = 'c0000000-0000-4000-8000-000000000003';
const AHMAD = 'a0000002-0000-4000-8000-000000000000';

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

async function captureWrites(page: Page) {
  const sent: { method: string; path: string; body: unknown }[] = [];
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'x'.repeat(43) } }),
  );
  await page.route(
    (url) => url.pathname.startsWith('/api/teach/'),
    async (route) => {
      const request = route.request();
      if (request.method() === 'GET') return route.fallback();
      const body = request.postDataJSON() as unknown;
      sent.push({ method: request.method(), path: new URL(request.url()).pathname, body });
      if (request.url().endsWith('/notes')) {
        return route.fulfill({
          json: [
            {
              id: 'n2',
              body: (body as { body: string }).body,
              authorName: 'Dania Hih',
              sharedWithAdmissions: true,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
      await route.fulfill({ status: 204, body: '' });
    },
  );
  return sent;
}

test.describe('cohort: students with progress (design "Instructor 2")', () => {
  test('attendance, status and filters; View opens the student page', async ({ page }) => {
    await signInAs(page, 'instructor');
    await page.goto(`/en/teach/cohorts/${COHORT}`);
    const table = page.getByRole('table');
    await expect(table).toContainText('80%');
    await expect(table).toContainText('Behind');

    await page.getByRole('button', { name: /^At risk/ }).click();
    const rows = table.getByRole('row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1)).toContainText('Ahmad Zeidan');

    await rows.nth(1).getByRole('link', { name: /View/ }).click();
    await expect(page).toHaveURL(new RegExp(`/en/teach/cohorts/${COHORT}/students/${AHMAD}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ahmad Zeidan');
  });

  test('Attendance tab: mark all present, change one, save', async ({ page }) => {
    await signInAs(page, 'instructor');
    const sent = await captureWrites(page);
    await page.goto(`/en/teach/cohorts/${COHORT}`);
    await page.getByRole('link', { name: 'Take attendance' }).click();
    await expect(page.getByRole('link', { name: 'Attendance', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await page.getByRole('button', { name: 'Mark all present' }).click();
    const lina = page.getByRole('group', { name: 'Attendance of Lina Hamdan' });
    await expect(lina.getByRole('radio', { name: 'Present' })).toBeChecked();
    await lina.getByText('Late', { exact: true }).click();
    await expect(lina.getByRole('radio', { name: 'Late' })).toBeChecked();

    await page.getByRole('button', { name: 'Save attendance' }).click();
    await expect(page.getByText('Attendance saved.')).toBeVisible();
    const saved = sent.find((call) => call.method === 'PUT');
    expect(saved?.path).toBe(`/api/teach/cohorts/${COHORT}/attendance`);
    expect((saved?.body as { marks: { status: string }[] }).marks.map((m) => m.status)).toEqual([
      'present',
      'late',
      'present',
    ]);
  });

  test('Class schedule tab lists the timetable and next classes', async ({ page }) => {
    await signInAs(page, 'instructor');
    await page.goto(`/en/teach/cohorts/${COHORT}?tab=schedule`);
    const card = page.getByRole('region', { name: 'Next classes' });
    await expect(card).toContainText('Sun & Wed · 18:00–21:00 (Jerusalem time)');
    await expect(card.getByRole('listitem')).toHaveCount(8);
  });
});

test.describe('student page for the instructor (design "Instructor 3")', () => {
  test('stats, last classes, mentoring plan and staff-only notes', async ({ page }) => {
    await signInAs(page, 'instructor');
    const sent = await captureWrites(page);
    await page.goto(`/en/teach/cohorts/${COHORT}/students/${AHMAD}`);

    await expect(
      page.getByText('Phone and payment details are visible to admissions and admin only.'),
    ).toBeVisible();
    await expect(page.getByText('5 of 10 classes')).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Attendance · last 10 classes' }).getByRole('listitem'),
    ).toHaveCount(10);
    const plan = page.getByRole('region', { name: 'Mentoring plan' });
    await expect(plan).toContainText('2 of 8');
    await expect(plan).toContainText('Planning the Module 3 API.');

    const notes = page.getByRole('region', { name: 'Instructor notes' });
    await expect(notes).toContainText('Staff only');
    await expect(notes).toContainText('Missed 2 classes');
    await notes.getByRole('button', { name: 'Save note' }).click();
    await expect(notes.getByText('Write the note.')).toBeVisible();

    await notes.getByLabel('Add a note').fill('Agreed to watch the recordings within 48 hours.');
    await notes.getByLabel(/Also share with admissions/).check();
    await notes.getByRole('button', { name: 'Save note' }).click();
    await expect(notes).toContainText('Agreed to watch the recordings');
    await expect(notes.getByLabel('Add a note')).toHaveValue('');
    expect(sent.find((call) => call.path.endsWith('/notes'))?.body).toEqual({
      body: 'Agreed to watch the recordings within 48 hours.',
      sharedWithAdmissions: true,
    });
  });

  test('students see their own attendance on My courses', async ({ page }) => {
    await signInAs(page, 'student');
    await page.goto('/en/app/courses');
    await expect(page.getByText('Attendance: 8 of 10 classes')).toBeVisible();
  });

  test('has no automatically detectable accessibility issues (en, ar)', async ({ page }) => {
    await signInAs(page, 'instructor');
    for (const path of [
      `/en/teach/cohorts/${COHORT}`,
      `/en/teach/cohorts/${COHORT}?tab=attendance`,
      `/ar/teach/cohorts/${COHORT}?tab=schedule`,
      `/ar/teach/cohorts/${COHORT}/students/${AHMAD}`,
    ]) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});
