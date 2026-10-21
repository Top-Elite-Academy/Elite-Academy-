import { expect, expectNoA11yViolations, test } from './fixtures';

test.describe('accessibility settings menu (IS 5568)', () => {
  test('changes the page at once, remembers the choice and resets', async ({
    page,
    consoleErrors,
  }) => {
    await page.goto('/en');
    const root = page.locator('html');
    const open = page.getByRole('button', { name: 'Accessibility settings' });
    await open.click();
    const menu = page.getByRole('dialog', { name: 'Accessibility settings' });
    await expect(menu).toBeVisible();

    const contrast = menu.getByRole('switch', { name: 'High contrast' });
    await contrast.click();
    await expect(contrast).toHaveAttribute('aria-checked', 'true');
    await expect(root).toHaveAttribute('data-a11y-contrast', '');

    await menu.getByText('Larger', { exact: true }).click();
    await expect(root).toHaveAttribute('data-a11y-text', 'larger');
    expect(await root.evaluate((el) => getComputedStyle(el).fontSize)).toBe('20px');

    // Escape closes the dialog and focus goes back to the button.
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(open).toBeFocused();

    // Applied before paint on the next page, and shown as chosen in the menu.
    await page.goto('/en/courses');
    await expect(root).toHaveAttribute('data-a11y-text', 'larger');
    await open.click();
    await expect(contrast).toHaveAttribute('aria-checked', 'true');
    await expect(menu.getByRole('radio', { name: 'Larger' })).toBeChecked();

    await menu.getByRole('button', { name: 'Reset all settings' }).click();
    await expect(root).not.toHaveAttribute('data-a11y-text');
    await expect(root).not.toHaveAttribute('data-a11y-contrast');
    expect(consoleErrors).toEqual([]);
  });

  test('every setting works together without accessibility issues (en, he)', async ({ page }) => {
    for (const locale of ['en', 'he']) {
      await page.goto(`/${locale}`);
      await page.locator('button[aria-haspopup="dialog"].fixed').click();
      const menu = page.getByRole('dialog');
      // Settings carry over from the previous language: switch on only what is off.
      await expect(menu.getByRole('switch')).toHaveCount(5);
      for (const toggle of await menu.getByRole('switch').all()) {
        if ((await toggle.getAttribute('aria-checked')) === 'false') await toggle.click();
      }
      await expect(page.locator('html')).toHaveAttribute('data-a11y-spacing', '');
      await expectNoA11yViolations(page);
      await page.keyboard.press('Escape');
      await expectNoA11yViolations(page);
    }
  });
});

test.describe('accessibility statement', () => {
  test('is linked from the footer and names the coordinator', async ({ page }) => {
    await page.goto('/en');
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Accessibility statement' })
      .click();
    await expect(page).toHaveURL(/\/en\/accessibility$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Accessibility statement');
    await expect(page.getByText(/IS 5568.*WCAG\) 2\.2, level AA/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Accessibility coordinator' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('has no accessibility issues in Arabic', async ({ page }) => {
    await page.goto('/ar/accessibility');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('بيان إمكانية الوصول');
    await expectNoA11yViolations(page);
  });
});
