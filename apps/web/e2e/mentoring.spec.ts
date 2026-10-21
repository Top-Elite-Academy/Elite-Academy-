import { expect, expectNoA11yViolations, test } from './fixtures';

const RANA = '11111111-1111-4111-8111-111111111111';

test.describe('mentoring and career advice (spec §3.5)', () => {
  test('shows the four mentoring packages with prices from the API, 8 sessions recommended', async ({
    page,
  }) => {
    await page.goto('/en/mentoring');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learn with personal support');
    const packages = page.getByRole('radiogroup', { name: 'Mentoring packages' });
    for (const price of ['₪250', '₪1,000', '₪2,000', '₪3,000']) {
      await expect(packages).toContainText(price);
    }
    await expect(
      packages.getByRole('radio', { name: /Mentoring plan · 8 sessions/ }),
    ).toBeChecked();
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Mentoring', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('the chosen package and mentor go into the booking link', async ({ page }) => {
    await page.goto('/en/mentoring');
    const book = page.getByRole('link', { name: /Book a session\W+Rana Arafat/ });
    await expect(book).toHaveAttribute('href', `/en/book?service=mentoring-8&mentor=${RANA}`);

    await page.getByText('4 sessions', { exact: true }).click();
    await expect(book).toHaveAttribute('href', `/en/book?service=mentoring-4&mentor=${RANA}`);
  });

  test('filters by specialty and session language', async ({ page }) => {
    await page.goto('/en/mentoring');
    const cards = page.getByRole('main').getByRole('article');
    await expect(cards).toHaveCount(2);

    await page.getByLabel('Specialty').selectOption('data');
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText('Rana Arafat');

    await page.getByLabel('Language', { exact: true }).selectOption('he');
    await expect(page.getByText('No teachers match these filters.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(cards).toHaveCount(2);
  });

  test('career advice tab: selected from the header link, no packages, friendly empty state', async ({
    page,
  }) => {
    await page.goto('/en/mentoring?tab=career');
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Career advice' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Career advisors' })).toBeVisible();
    await expect(page.getByRole('radiogroup')).toHaveCount(0);
    await expect(page.getByText('will be listed here soon')).toBeVisible();
  });

  test('has no automatically detectable accessibility issues (en, ar)', async ({ page }) => {
    for (const path of ['/en/mentoring', '/ar/mentoring?tab=career']) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});

test.describe('mentoring on a phone @mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile layout only');

  test('fits the screen', async ({ page }) => {
    await page.goto('/he/mentoring');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
