import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

/** Stand-ins for Cloudflare Turnstile and the API, so the test needs neither. */
async function mockBrowserServices(page: Page) {
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.turnstile = {
        render(el, options) { setTimeout(() => options.callback('test-token'), 10); return 'w1'; },
        remove() {},
      };`,
    }),
  );
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'x'.repeat(43) } }),
  );
  const submitted: Record<string, unknown>[] = [];
  await page.route('**/api/leads/website', async (route) => {
    submitted.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 202, body: '' });
  });
  return submitted;
}

test.describe('enroll — book a call (spec §3.6)', () => {
  test('preselects the program from the link and promises no payment', async ({ page }) => {
    await mockBrowserServices(page);
    await page.goto('/en/enroll?program=data-analysis-ai');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Enroll — book a call with us',
    );
    await expect(page.getByRole('combobox', { name: /^Program/ })).toHaveValue('data-analysis-ai');
    await expect(page.getByRole('main')).toContainText('No payment now.');
    await expect(page.getByRole('main')).not.toContainText('payment online');
  });

  test('shows errors under each field and focuses the first one', async ({ page }) => {
    await mockBrowserServices(page);
    await page.goto('/en/enroll');
    await page.getByRole('button', { name: 'Submit — book my call' }).click();

    await expect(page.getByRole('combobox', { name: /^Program/ })).toBeFocused();
    await expect(page.getByText('Choose a program.')).toBeVisible();
    await expect(page.getByText('Choose at least one day.')).toBeVisible();
    await expect(page.getByText('Choose at least one time range.')).toBeVisible();
    await expect(page.getByText('Please agree so we can contact you.')).toBeVisible();
  });

  test('sends a valid form and thanks the visitor by name', async ({ page }) => {
    const submitted = await mockBrowserServices(page);
    await page.goto(
      '/en/enroll?program=full-stack-advanced-ai&cohort=3f1c2b6e-8a4d-4c1e-9b7a-2d5e6f7a8b9c',
    );

    await page.getByLabel('First name').fill('Maya');
    await page.getByLabel('Last name').fill('Rizk');
    await page.getByLabel('Phone number').fill('050-123-4567');
    await page.getByText('Sunday').click();
    await page.getByText('Evening').click();
    await page.getByLabel(/may contact me about this program/).check();
    await page.getByRole('button', { name: 'Submit — book my call' }).click();

    await expect(page.getByRole('heading', { name: 'Thank you, Maya!' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read the syllabus meanwhile' })).toHaveAttribute(
      'href',
      '/en/courses/full-stack-advanced-ai/syllabus',
    );
    expect(submitted[0]).toMatchObject({
      programSlug: 'full-stack-advanced-ai',
      cohortId: '3f1c2b6e-8a4d-4c1e-9b7a-2d5e6f7a8b9c',
      phone: '+972501234567',
      days: ['sun'],
      hours: ['evening'],
      consent: true,
      locale: 'en',
      captchaToken: 'test-token',
    });
  });

  test('has no automatically detectable accessibility issues (en, he)', async ({ page }) => {
    await mockBrowserServices(page);
    for (const path of ['/en/enroll', '/he/enroll?program=python-ai']) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});

test.describe('enroll on a phone @mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile layout only');

  test('fits the screen', async ({ page }) => {
    await mockBrowserServices(page);
    await page.goto('/ar/enroll');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
