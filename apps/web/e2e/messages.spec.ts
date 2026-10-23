import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

const THREAD = 'e1000000-0000-4000-8000-000000000001';
const DANIA = '88888888-8888-4888-8888-888888888888';
const LESSON = 'd0000000-0000-4000-8000-000000000012';

async function signIn(page: Page, who: 'instructor' | '1') {
  await page
    .context()
    .addCookies([{ name: 'mock_session', value: who, domain: 'localhost', path: '/' }]);
}

/** Records messages the page sends; new threads answer with the mock thread. */
async function captureWrites(page: Page) {
  const sent: { path: string; body: string }[] = [];
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'x'.repeat(43) } }),
  );
  await page.route(
    (url) => url.pathname.startsWith('/api/messages/conversations'),
    async (route) => {
      const request = route.request();
      if (request.method() === 'GET') return route.fallback();
      sent.push({ path: new URL(request.url()).pathname, body: request.postData() ?? '' });
      await route.fulfill({ status: 201, json: { id: THREAD } });
    },
  );
  return sent;
}

test.describe('messages & support (spec §4.9)', () => {
  test('a student reads a thread, sees attachments and read receipts, and replies', async ({
    page,
  }) => {
    await signIn(page, '1');
    const sent = await captureWrites(page);
    await page.route('**/api/messages/unread', (route) => route.fulfill({ json: { unread: 1 } }));
    await page.goto('/en/app/messages');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Messages');
    await expect(page.getByRole('link', { name: 'Unread (1)' })).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Student area' })
        .first()
        .getByRole('link', { name: 'Messages & support 1 conversation with new messages' }),
    ).toBeVisible();

    const threads = page.getByRole('navigation', { name: 'Conversations' });
    await threads.getByRole('link', { name: /Dania Hih/ }).click();
    await expect(page).toHaveURL(new RegExp(`thread=${THREAD}`));
    const log = page.getByRole('log', { name: 'Conversation with Dania Hih' });
    await expect(log).toContainText('How do refresh tokens rotate?');
    await expect(log.getByRole('link', { name: 'Download diagram.png' })).toHaveAttribute(
      'href',
      '/api/messages/attachments/e2000000-0000-4000-8000-000000000001/download',
    );
    await expect(page.getByText('Seen')).toBeVisible();

    await page.getByLabel('Your message').fill('Thanks, that helps!');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect
      .poll(() => sent.at(-1)?.path)
      .toBe(`/api/messages/conversations/${THREAD}/messages`);
    expect(sent.at(-1)?.body).toContain('Thanks, that helps!');
    await expect(page.getByLabel('Your message')).toHaveValue('');
  });

  test('New message: only allowed recipients; "Contact support" opens it ready', async ({
    page,
  }) => {
    await signIn(page, '1');
    const sent = await captureWrites(page);
    await page.route('**/media/demo.mp4', (route) =>
      route.fulfill({ status: 200, contentType: 'video/mp4', body: '' }),
    );
    await page.goto(`/en/app/courses/full-stack-advanced-ai/lessons/${LESSON}`);
    await page.getByRole('link', { name: 'Contact support' }).click();

    const dialog = page.getByRole('dialog', { name: 'New message' });
    await expect(dialog).toBeVisible();
    const to = dialog.getByLabel('To');
    await expect(to).toHaveValue('support');
    await expect(to.locator('option')).toHaveText([
      'Dania Hih · Full Stack Advanced with AI · FSA-03',
      'Support team',
      'Payments team',
    ]);
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByText('Write a message.')).toBeVisible();
    await dialog.getByLabel('Message').fill('The video does not load.');
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(page).toHaveURL(new RegExp(`thread=${THREAD}`));
    expect(JSON.parse(sent[0]?.body ?? '{}')).toEqual({
      to: 'support',
      subject: '',
      body: 'The video does not load.',
    });
  });

  test('"Ask the instructor" under a lesson opens a thread with the lesson as subject', async ({
    page,
  }) => {
    await signIn(page, '1');
    const sent = await captureWrites(page);
    await page.route('**/media/demo.mp4', (route) =>
      route.fulfill({ status: 200, contentType: 'video/mp4', body: '' }),
    );
    await page.goto(`/en/app/courses/full-stack-advanced-ai/lessons/${LESSON}`);
    await page.getByRole('tab', { name: 'Ask the instructor' }).click();
    await page.getByLabel('Your question for Dania Hih').fill('Where do I store the token?');
    await page.getByRole('button', { name: 'Send question' }).click();
    await expect(page.getByText('Sent. The answer will appear in Messages.')).toBeVisible();
    expect(JSON.parse(sent[0]?.body ?? '{}')).toEqual({
      to: DANIA,
      subject: 'Lesson 12: Authentication and sessions',
      body: 'Where do I store the token?',
    });
    await expect(page.getByRole('link', { name: 'Open messages' })).toHaveAttribute(
      'href',
      `/en/app/messages?thread=${THREAD}`,
    );
  });

  test('instructors have Messages with their students', async ({ page }) => {
    await signIn(page, 'instructor');
    await page.goto(`/en/teach/messages?thread=${THREAD}`);
    await expect(
      page
        .getByRole('navigation', { name: 'Teaching' })
        .first()
        .getByRole('link', { name: 'Messages' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('log', { name: 'Conversation with Maya Rizk' })).toBeVisible();
    await page.getByRole('button', { name: 'New message' }).click();
    await expect(
      page.getByRole('dialog', { name: 'New message' }).getByLabel('To').locator('option'),
    ).toHaveText(['Maya Rizk · FSA-03']);
  });

  test('has no automatically detectable accessibility issues (en, ar, he)', async ({ page }) => {
    await signIn(page, '1');
    for (const locale of ['en', 'ar']) {
      await page.goto(`/${locale}/app/messages?thread=${THREAD}`);
      await expectNoA11yViolations(page);
    }
    await signIn(page, 'instructor');
    await page.goto(`/he/teach/messages?thread=${THREAD}`);
    await expectNoA11yViolations(page);
  });
});
