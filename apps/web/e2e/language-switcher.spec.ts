import { expect, test } from './fixtures';

test.describe('language switcher', () => {
  test('switches language and direction, stays on the page, and is remembered', async ({
    page,
  }) => {
    await page.goto('/en/forgot-password');
    await page
      .getByRole('banner')
      .getByRole('button', { name: 'Current language: English' })
      .click();
    await page.getByRole('link', { name: 'العربية' }).click();

    await expect(page).toHaveURL(/\/ar\/forgot-password$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('إعادة تعيين كلمة المرور');

    // The choice is saved in a cookie: the bare domain now opens Arabic.
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar$/);
  });

  test('Hebrew is right-to-left', async ({ page }) => {
    await page.goto('/he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('works with the keyboard and closes with Escape', async ({ page }) => {
    await page.goto('/en');
    const button = page
      .getByRole('banner')
      .getByRole('button', { name: 'Current language: English' });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'עברית' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
  });
});
