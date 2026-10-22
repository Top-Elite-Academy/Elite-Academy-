import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

const PROGRAM = 'b0000000-0000-4000-8000-000000000001';
const EDIT = 'd0000000-0000-4000-8000-000000000012';
const READY = 'd0000000-0000-4000-8000-000000000013';
const contentPath = (lesson: string) => `/en/teach/content?program=${PROGRAM}&lesson=${lesson}`;

async function signInAsInstructor(page: Page) {
  await page
    .context()
    .addCookies([{ name: 'mock_session', value: 'instructor', domain: 'localhost', path: '/' }]);
}

/** Captures what the page sends to the API (JSON, multipart or raw video). */
async function captureWrites(page: Page) {
  const sent: { method: string; path: string; body: string; json: unknown }[] = [];
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'x'.repeat(43) } }),
  );
  await page.route(
    (url) => url.pathname.startsWith('/api/teach/'),
    async (route) => {
      const request = route.request();
      if (request.method() === 'GET') return route.fallback();
      const path = new URL(request.url()).pathname;
      const body = request.postData() ?? '';
      let json: unknown = null;
      try {
        json = JSON.parse(body);
      } catch {
        // multipart or raw video
      }
      sent.push({ method: request.method(), path, body, json });
      if (path.endsWith('/videos')) {
        return route.fulfill({
          status: 201,
          json: {
            video: {
              id: 'v9',
              fileName: 'intro.mp4',
              sizeBytes: 9,
              durationSec: null,
              status: 'uploading',
            },
            upload: { protocol: 'put', url: '/api/teach/videos/v9/content' },
          },
        });
      }
      if (path.endsWith('/lessons') && request.method() === 'POST') {
        return route.fulfill({ status: 201, json: { id: READY } });
      }
      await route.fulfill({ json: {} });
    },
  );
  return sent;
}

test.describe('course content (design "Instructor 6")', () => {
  test('lessons by module with status; the editor shows videos, files and why it cannot publish yet', async ({
    page,
  }) => {
    await signInAsInstructor(page);
    await page.goto(contentPath(EDIT));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Course content');
    await expect(
      page.getByText(/Full Stack Advanced with AI · shared by all cohorts/),
    ).toBeVisible();

    const lessons = page.getByRole('navigation', { name: 'Lessons' });
    await expect(lessons).toContainText('Module 1 · Back end & data');
    await expect(
      lessons.getByRole('link', { name: /Authentication and sessions/ }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(lessons.getByRole('link', { name: /Prisma schema and seed/ })).toContainText(
      'Published',
    );
    await expect(lessons.getByRole('link', { name: /Authentication and sessions/ })).toContainText(
      'Processing',
    );

    await expect(page.getByRole('textbox', { name: 'Lesson title' })).toHaveValue(
      'Authentication and sessions',
    );
    await expect(page.getByText('auth-sessions-part1.mp4', { exact: true })).toBeVisible();
    await expect(page.getByText('1.6 GB')).toBeVisible();
    await expect(page.getByText('Scanned · safe')).toBeVisible();
    await expect(page.getByText('Scanning…')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish lesson' })).toBeDisabled();
    await expect(page.getByText('You can publish when every video is ready')).toBeVisible();
  });

  test('Save draft sends the title, text, week and module', async ({ page }) => {
    await signInAsInstructor(page);
    const sent = await captureWrites(page);
    await page.goto(contentPath(EDIT));
    await page.getByRole('textbox', { name: 'Lesson title' }).fill('Sessions and protected routes');
    await page.getByLabel('Students can open it from').selectOption('13');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
    expect(sent.find((call) => call.method === 'PATCH')?.json).toEqual({
      title: 'Sessions and protected routes',
      about: 'In this lesson you add sign-in to the Module 3 API.',
      availableFromWeek: 13,
      moduleId: 'b0000000-0000-4000-8000-000000000003',
    });
  });

  test('uploads materials and a video, publishes a ready lesson', async ({ page }) => {
    await signInAsInstructor(page);
    const sent = await captureWrites(page);
    await page.goto(contentPath(READY));

    await page.getByLabel('Type').selectOption('exercise');
    await page.getByLabel('Add files', { exact: true }).setInputFiles({
      name: 'starter.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('PK starter'),
    });
    await expect
      .poll(() => sent.find((call) => call.path.endsWith('/files'))?.body ?? '')
      .toContain('filename="starter.zip"');
    expect(sent.find((call) => call.path.endsWith('/files'))?.body).toContain('exercise');

    await page.locator('input[type=file][accept^="video/"]').setInputFiles({
      name: 'intro.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-mp4!'),
    });
    await expect
      .poll(() => sent.some((call) => call.method === 'PUT' && call.path.endsWith('/v9/content')))
      .toBe(true);
    expect(sent.find((call) => call.path.endsWith('/videos'))?.json).toEqual({
      fileName: 'intro.mp4',
      sizeBytes: 9,
    });

    await page.getByRole('button', { name: 'Publish lesson' }).click();
    await expect(page.getByText('Published — students can open it.')).toBeVisible();
    expect(sent.map((call) => call.path)).toContain(`/api/teach/lessons/${READY}/publish`);
  });

  test('Add lesson creates a draft and opens it', async ({ page }) => {
    await signInAsInstructor(page);
    const sent = await captureWrites(page);
    await page.goto(contentPath(EDIT));
    await page.getByRole('button', { name: 'Add lesson' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a lesson' });
    await dialog.getByRole('button', { name: 'Add lesson' }).click();
    await expect(dialog.getByText('Write a title.')).toBeVisible();
    await dialog.getByLabel('Lesson title').fill('Retrieval with pgvector');
    await dialog.getByRole('button', { name: 'Add lesson' }).click();
    await expect(page).toHaveURL(new RegExp(`lesson=${READY}$`));
    expect(sent.find((call) => call.path.endsWith('/lessons'))?.json).toEqual({
      title: 'Retrieval with pgvector',
      moduleId: 'b0000000-0000-4000-8000-000000000003',
    });
  });

  test('has no automatically detectable accessibility issues (en, ar)', async ({ page }) => {
    await signInAsInstructor(page);
    for (const path of [
      contentPath(EDIT),
      `/ar/teach/content?program=${PROGRAM}&lesson=${READY}`,
    ]) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});
