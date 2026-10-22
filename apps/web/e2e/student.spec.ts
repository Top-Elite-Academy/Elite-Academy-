import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

async function signIn(page: Page) {
  await page
    .context()
    .addCookies([{ name: 'mock_session', value: '1', domain: 'localhost', path: '/' }]);
}

test.describe('student area (spec §4)', () => {
  test('signed-out visitors are sent to sign-in and back', async ({ page }) => {
    await page.goto('/en/app/sessions');
    await expect(page).toHaveURL(/\/en\/login\?next=%2Fapp$/);
  });

  test('overview: welcome, next session with Join, mentoring plan progress', async ({ page }) => {
    await signIn(page);
    await page.goto('/en/app');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome back, Maya');

    const sidebar = page.getByRole('complementary').getByRole('navigation', {
      name: 'Student area',
    });
    await expect(sidebar.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    const upcoming = page.getByRole('region', { name: 'Upcoming sessions' });
    await expect(upcoming).toContainText('Mentoring plan · 8 sessions');
    await expect(upcoming).toContainText('with Rana Arafat');
    await expect(upcoming.getByRole('link', { name: 'Join' })).toHaveAttribute(
      'href',
      'https://zoom.example/j/1',
    );

    const plan = page.getByRole('region', { name: 'Your mentoring plan' });
    await expect(plan).toContainText('1 of 8 meetings used');
    await expect(plan.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    await expect(page.getByRole('region', { name: 'My courses' })).toContainText(
      'Full Stack Advanced with AI · FSA-03',
    );
  });

  test('sessions: upcoming with join times, past with what happened', async ({ page }) => {
    await signIn(page);
    await page.goto('/en/app/sessions');
    const sessions = page.getByRole('main').getByRole('article');
    await expect(sessions).toHaveCount(2);
    await expect(sessions.nth(1)).toContainText(/Join opens at \d\d:\d\d/);
    await expect(sessions.nth(1).getByRole('link', { name: 'Add to calendar' })).toHaveAttribute(
      'href',
      '/api/bookings/s0000000-0000-4000-8000-000000000002/calendar.ics',
    );

    await page.getByRole('link', { name: 'Past' }).click();
    await expect(page.getByRole('link', { name: 'Past' })).toHaveAttribute('aria-current', 'page');
    await expect(sessions).toHaveCount(1);
    await expect(sessions).toContainText('Completed');
  });

  test('payments: statuses, and a failed payment can be tried again', async ({ page }) => {
    await signIn(page);
    await page.route('**/api/auth/csrf', (route) =>
      route.fulfill({ json: { csrfToken: 'x'.repeat(43) } }),
    );
    await page.route('**/api/bookings/*/checkout', (route) =>
      route.fulfill({ json: { redirectUrl: '/en/book/test-checkout?booking=x' } }),
    );
    await page.goto('/en/app/payments');
    const orders = page.getByRole('main').getByRole('article');
    await expect(orders.first()).toContainText('₪2,000');
    await expect(orders.first()).toContainText('Paid');
    await expect(orders.nth(1)).toContainText('Reason: the card was declined');
    await orders.nth(1).getByRole('button', { name: 'Try payment again' }).click();
    await expect(page).toHaveURL(/\/en\/book\/test-checkout\?booking=x$/);
  });

  test('phones: bottom tab bar instead of the sidebar @mobile', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'phone layout only');
    await signIn(page);
    await page.goto('/en/app');
    await expect(page.getByRole('complementary')).toBeHidden();
    const tabs = page.locator('[data-bottom-bar]').getByRole('link');
    await expect(tabs).toHaveText([
      'Home',
      'My courses',
      'Sessions',
      'Messages & support',
      'Account',
    ]);
    await tabs.filter({ hasText: 'Sessions' }).click();
    await expect(page).toHaveURL(/\/en\/app\/sessions$/);
    await expect(tabs.filter({ hasText: 'Sessions' })).toHaveAttribute('aria-current', 'page');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no automatically detectable accessibility issues (en, ar)', async ({ page }) => {
    await signIn(page);
    for (const path of [
      '/en/app',
      '/ar/app',
      '/en/app/sessions?tab=past',
      '/he/app/payments',
      '/en/app/profile',
      '/en/app/messages',
    ]) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});
