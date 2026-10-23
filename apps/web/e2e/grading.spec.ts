import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

const COHORT = 'c0000000-0000-4000-8000-000000000003';
const PROGRAM = 'b0000000-0000-4000-8000-000000000001';
const SUBMISSION = 'f0000000-0000-4000-8000-000000000001';
const EDIT = 'd0000000-0000-4000-8000-000000000012';
const DONE = 'd0000000-0000-4000-8000-000000000011';
const gradingPath = `/en/teach/grading?cohort=${COHORT}&submission=${SUBMISSION}`;
const lessonPath = (id: string) => `/en/app/courses/full-stack-advanced-ai/lessons/${id}`;

async function signIn(page: Page, who: 'instructor' | '1') {
  await page
    .context()
    .addCookies([{ name: 'mock_session', value: who, domain: 'localhost', path: '/' }]);
}

/** Records what the page writes to the API. */
async function captureWrites(page: Page) {
  const sent: { method: string; path: string; body: string }[] = [];
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'x'.repeat(43) } }),
  );
  await page.route(
    (url) => url.pathname.startsWith('/api/teach/') || url.pathname.startsWith('/api/me/'),
    async (route) => {
      const request = route.request();
      if (request.method() === 'GET') return route.fallback();
      sent.push({
        method: request.method(),
        path: new URL(request.url()).pathname,
        body: request.postData() ?? '',
      });
      await route.fulfill({ json: { assignment: null } });
    },
  );
  return sent;
}

test.describe('grading (design "Instructor 4")', () => {
  test('hand-ins to grade, oldest first, with the rubric panel; draft then return', async ({
    page,
  }) => {
    await signIn(page, 'instructor');
    const sent = await captureWrites(page);
    await page.goto(gradingPath);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Grading');
    await expect(page.getByRole('link', { name: 'To grade (1)' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const list = page.getByRole('navigation', { name: 'Hand-ins' });
    await expect(list.getByRole('link', { name: /Lina Hamdan/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(list).toContainText('Late · 2 days');

    await expect(page.getByRole('heading', { level: 2, name: 'Lina Hamdan' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'https://github.com/lina/auth-api' }),
    ).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    await expect(page.getByRole('link', { name: 'Download notes.pdf' })).toHaveAttribute(
      'href',
      `/api/teach/submissions/${SUBMISSION}/files/sf1/download`,
    );
    await expect(
      page.getByText('Give points for every criterion to return the work.'),
    ).toBeVisible();

    const works = page.getByRole('group', { name: 'Works correctly (up to 60 points)' });
    await works.getByLabel('Points').fill('55');
    await works.getByLabel('Comment').fill('Login works.');
    await page
      .getByRole('group', { name: 'Code quality (up to 40 points)' })
      .getByLabel('Points')
      .fill('35');
    await expect(page.getByText('Total: 90 / 100')).toBeVisible();
    await page.getByLabel('Feedback for the student').fill('Good work.');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Draft saved. The student doesn’t see it yet.')).toBeVisible();
    const draft = sent.find((call) => call.method === 'PUT');
    expect(JSON.parse(draft?.body ?? '{}')).toEqual({
      scores: [
        { criterionId: 'works', points: 55, comment: 'Login works.' },
        { criterionId: 'quality', points: 35, comment: '' },
      ],
      feedback: 'Good work.',
    });

    await page.getByRole('button', { name: 'Return to student' }).click();
    const dialog = page.getByRole('dialog', { name: 'Return the grade to Lina Hamdan?' });
    await expect(dialog).toContainText('90/100');
    await dialog.getByRole('button', { name: 'Return', exact: true }).click();
    await expect
      .poll(() => sent.map((call) => call.path))
      .toContain(`/api/teach/submissions/${SUBMISSION}/return`);
  });

  test('the lesson editor holds the exercise and a rubric that adds up to 100', async ({
    page,
  }) => {
    await signIn(page, 'instructor');
    const sent = await captureWrites(page);
    await page.goto(`/en/teach/content?program=${PROGRAM}&lesson=${EDIT}`);
    const section = page.getByRole('region', { name: 'Exercise to hand in' });
    await expect(section.getByLabel('Exercise title')).toHaveValue('Auth API');
    await expect(section.getByText('2 students handed it in.')).toBeVisible();

    await section.getByLabel('Points for criterion 1').fill('50');
    await expect(section.getByText('Total: 90 / 100')).toBeVisible();
    await expect(section.getByRole('button', { name: 'Save exercise' })).toBeDisabled();
    await section.getByRole('button', { name: 'Add criterion' }).click();
    await section.getByLabel('Criterion 3', { exact: true }).fill('Tests');
    await section.getByLabel('Points for criterion 3').fill('10');
    await section.getByRole('button', { name: 'Save exercise' }).click();
    await expect.poll(() => sent.length).toBe(1);
    const body = JSON.parse(sent[0]?.body ?? '{}') as { dueWeek: number; rubric: unknown[] };
    expect(body.dueWeek).toBe(12);
    expect(body.rubric).toEqual([
      { id: 'works', title: 'Works correctly', maxPoints: 50 },
      { id: 'quality', title: 'Code quality', maxPoints: 40 },
      { title: 'Tests', maxPoints: 10 },
    ]);
  });

  test('a student hands in a link and files, and reads returned feedback', async ({ page }) => {
    await signIn(page, '1');
    const sent = await captureWrites(page);
    await page.route('**/media/demo.mp4', (route) =>
      route.fulfill({ status: 200, contentType: 'video/mp4', body: '' }),
    );
    await page.goto(lessonPath(EDIT));
    const exercise = page.getByRole('region', { name: 'Auth API' });
    await expect(exercise).toContainText('Late work is accepted and marked late.');
    await exercise.getByLabel('GitHub repository link').fill('https://github.com/maya/auth-api');
    await exercise.getByLabel('Files').setInputFiles({
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7'),
    });
    await exercise.getByRole('button', { name: 'Hand in' }).click();
    await expect(exercise.getByText('Handed in. Your instructor will grade it.')).toBeVisible();
    const handIn = sent.find((call) => call.path.endsWith('/submission'));
    expect(handIn?.body).toContain('https://github.com/maya/auth-api');
    expect(handIn?.body).toContain('filename="notes.pdf"');

    await page.goto(lessonPath(DONE));
    const graded = page.getByRole('region', { name: 'Seed script' });
    await expect(graded).toContainText('Your grade: 88/100');
    await expect(graded).toContainText('55/60 points — Seeds run twice safely.');
    await expect(graded).toContainText('Great work.');
    await expect(graded).toContainText('Late · 1 day');
    await expect(graded.getByRole('button', { name: 'Hand in' })).toHaveCount(0);
  });

  test('has no automatically detectable accessibility issues (en, ar)', async ({ page }) => {
    await signIn(page, 'instructor');
    for (const path of [gradingPath, gradingPath.replace('/en/', '/ar/')]) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
    await signIn(page, '1');
    await page.route('**/media/demo.mp4', (route) =>
      route.fulfill({ status: 200, contentType: 'video/mp4', body: '' }),
    );
    for (const path of [lessonPath(EDIT), lessonPath(DONE).replace('/en/', '/he/')]) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});
