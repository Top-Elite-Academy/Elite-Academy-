import { expect, expectNoA11yViolations, test } from './fixtures';

test.describe('header: Log in / My area', () => {
  test('guests see Log in; it opens the sign-in page', async ({ page }) => {
    await page.goto('/en/courses');
    await page.getByRole('banner').getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/en\/login$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('signed in: My area opens the area for the role; /login goes there too', async ({
    page,
  }) => {
    await page
      .context()
      .addCookies([{ name: 'mock_session', value: 'instructor', domain: 'localhost', path: '/' }]);
    await page.goto('/en');
    await expect(page.getByRole('banner').getByRole('link', { name: 'My area' })).toHaveAttribute(
      'href',
      '/en/teach',
    );
    await page.goto('/en/login');
    await expect(page).toHaveURL(/\/en\/teach$/);
  });

  test('phones: the menu has Log in @mobile', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'phone layout only');
    await page.goto('/ar');
    await page.getByRole('button', { name: 'افتح القائمة' }).click();
    const menu = page.getByRole('dialog');
    await expect(menu.getByRole('link', { name: 'تسجيل الدخول' })).toHaveAttribute(
      'href',
      '/ar/login',
    );
    await expectNoA11yViolations(page);
  });
});
