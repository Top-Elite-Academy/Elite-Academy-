import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

const COURSE = '/en/app/courses/full-stack-advanced-ai';
const DONE = 'd0000000-0000-4000-8000-000000000011';
const CURRENT = 'd0000000-0000-4000-8000-000000000012';
const lessonPath = (id: string, locale = 'en') =>
  `/${locale}/app/courses/full-stack-advanced-ai/lessons/${id}`;

async function signInAsStudent(page: Page) {
  await page
    .context()
    .addCookies([{ name: 'mock_session', value: '1', domain: 'localhost', path: '/' }]);
  // The mock has no real video file.
  await page.route('**/media/demo.mp4', (route) =>
    route.fulfill({ status: 200, contentType: 'video/mp4', body: '' }),
  );
}

/** Records the progress the player sends. */
async function captureProgress(page: Page) {
  const sent: unknown[] = [];
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'x'.repeat(43) } }),
  );
  await page.route('**/api/me/lessons/*/progress', async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  return sent;
}

test.describe('lesson player (spec §4.8)', () => {
  test('My courses opens the course; the outline shows progress, done and locked lessons', async ({
    page,
  }) => {
    await signInAsStudent(page);
    await page.goto('/en/app/courses');
    await page.getByRole('link', { name: 'Open course' }).click();
    await expect(page).toHaveURL(new RegExp(`${COURSE}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Full Stack Advanced with AI');
    await expect(page.getByText('FSA-03 · Week 12')).toBeVisible();
    await expect(page.getByText('33% complete')).toBeVisible();

    const outline = page.getByRole('navigation', { name: 'Course content' });
    await expect(outline.getByRole('link', { name: /Prisma schema and seed/ })).toContainText(
      '(completed)',
    );
    await expect(outline.getByRole('link', { name: /Calling AI models/ })).toHaveCount(0);
    await expect(outline).toContainText('Opens in week 14');

    await page.getByRole('link', { name: 'Continue learning' }).click();
    await expect(page).toHaveURL(new RegExp(`${lessonPath(CURRENT)}$`));
  });

  test('a lesson: video, about, downloads, mark as complete, previous (locked next is skipped)', async ({
    page,
  }) => {
    await signInAsStudent(page);
    const sent = await captureProgress(page);
    await page.goto(lessonPath(CURRENT));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Authentication and sessions');
    await expect(page.getByLabel('Lesson video, part 1 of 1')).toHaveAttribute(
      'src',
      '/media/demo.mp4',
    );
    await expect(
      page.getByRole('navigation', { name: 'Course content' }).getByRole('link', {
        name: /Authentication and sessions/,
      }),
    ).toHaveAttribute('aria-current', 'page');

    await expect(page.getByRole('tabpanel', { name: 'About' })).toContainText(
      'In this lesson you add sign-in',
    );
    await page.getByRole('tab', { name: 'About' }).press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Downloads (2)' })).toBeFocused();
    const downloads = page.getByRole('tabpanel', { name: 'Downloads (2)' });
    await expect(downloads).toContainText('Exercise');
    await expect(
      downloads.getByRole('link', { name: 'Download lesson-12-slides.pdf' }),
    ).toHaveAttribute('href', `/api/me/lessons/${CURRENT}/files/f1/download`);

    await page.getByRole('button', { name: 'Mark as complete' }).click();
    await expect.poll(() => sent).toContainEqual({ completed: true });

    await expect(page.getByRole('link', { name: 'Next lesson' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Previous lesson' }).click();
    await expect(page).toHaveURL(new RegExp(`${lessonPath(DONE)}$`));
    await expect(page.getByRole('button', { name: 'Mark as complete' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('This lesson has no video.')).toBeVisible();
  });

  test('a lesson that is not the student’s shows 404', async ({ page }) => {
    await signInAsStudent(page);
    const response = await page.goto(lessonPath('d0000000-0000-4000-8000-000000000099'));
    expect(response?.status()).toBe(404);
  });

  test('has no automatically detectable accessibility issues (en, he)', async ({ page }) => {
    await signInAsStudent(page);
    for (const path of [COURSE, lessonPath(CURRENT), lessonPath(CURRENT, 'he')]) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});
