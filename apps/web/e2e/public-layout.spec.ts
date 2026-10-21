import { expect, expectNoA11yViolations, test } from './fixtures';

test.describe('public layout', () => {
  test('first visit opens English, whatever the browser language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ar-IL' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await context.close();
  });

  test('header links match the site map (spec §2)', async ({ page }) => {
    await page.goto('/en');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Courses' })).toHaveAttribute('href', '/en/courses');
    await expect(nav.getByRole('link', { name: 'Mentoring' })).toHaveAttribute(
      'href',
      '/en/mentoring?tab=mentoring',
    );
    await expect(nav.getByRole('link', { name: 'Career advice' })).toHaveAttribute(
      'href',
      '/en/mentoring?tab=career',
    );
    await expect(nav.getByRole('link', { name: 'Success stories' })).toHaveAttribute(
      'href',
      '/en#stories',
    );
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Elite Tech Academy — home' }),
    ).toHaveAttribute('href', '/en');
    // Log in is hidden in version 1.
    await expect(page.getByRole('link', { name: /log in|sign in/i })).toHaveCount(0);
  });

  test('footer has every column and safe external links', async ({ page }) => {
    await page.goto('/en');
    const footer = page.getByRole('contentinfo');
    for (const column of ['Learn', 'Help', 'Legal']) {
      await expect(footer.getByRole('navigation', { name: column })).toBeVisible();
    }
    await expect(footer.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/en/privacy',
    );
    const external = footer.locator('a[target="_blank"]');
    await expect(external).toHaveCount(3);
    for (const link of await external.all()) {
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  test('skip link moves keyboard users to the main content', async ({ page }) => {
    await page.goto('/en');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('has no automatically detectable accessibility issues (en, ar)', async ({ page }) => {
    for (const path of ['/en', '/ar']) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });

  test('renders without console or CSP errors', async ({ page, consoleErrors }) => {
    await page.goto('/en');
    await page.goto('/he/login');
    expect(consoleErrors).toEqual([]);
  });
});

test.describe('unknown URLs', () => {
  test('show a 404 page inside the public frame', async ({ page }) => {
    const response = await page.goto('/en/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Go to the home page' }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
