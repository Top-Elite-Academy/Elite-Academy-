import { expect, expectNoA11yViolations, test } from './fixtures';

test.describe('sign-in form (client-side validation)', () => {
  test('shows translated errors under the fields and focuses the first one', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByRole('button', { name: 'Sign in' }).click();

    const email = page.getByLabel('Email');
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('This field is required.')).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('shows errors in Hebrew on the Hebrew page', async ({ page }) => {
    await page.goto('/he/login');
    await page.getByRole('button', { name: 'כניסה' }).click();
    await expect(page.getByText('יש להזין כתובת דוא״ל תקינה.')).toBeVisible();
  });
});

test.describe('reset password link', () => {
  test('explains what to do when the link has no token', async ({ page }) => {
    await page.goto('/en/reset-password');
    // Scope to <main>: Next.js adds its own empty role="alert" route announcer.
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'This link is incomplete',
    );
    await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
  });

  test('removes the token from the address bar and checks the passwords match', async ({
    page,
  }) => {
    await page.goto(`/en/reset-password#token=${'a'.repeat(43)}`);
    await expect(page).toHaveURL(/\/en\/reset-password$/);

    await page.getByLabel('New password', { exact: false }).first().fill('a-long-password-123');
    await page.getByLabel('Repeat the new password').fill('something-else-123');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.getByText('The passwords do not match.')).toBeVisible();
  });
});
