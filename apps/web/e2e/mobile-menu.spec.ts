import { expect, expectNoA11yViolations, test } from './fixtures';

test.describe('mobile menu @mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile layout only');

  test('opens full screen with the spec links and closes back to the button', async ({ page }) => {
    await page.goto('/en');
    const openButton = page.getByRole('button', { name: 'Open menu' });
    await openButton.click();

    const menu = page.getByRole('dialog', { name: 'Menu' });
    await expect(menu).toBeVisible();
    for (const label of [
      'Courses',
      'Teacher mentoring',
      'Career advice',
      'Success stories',
      'FAQ',
      'Contact us',
    ]) {
      await expect(menu.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    await expect(menu.getByRole('link', { name: 'Explore courses' })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(openButton).toBeFocused();
  });
});
