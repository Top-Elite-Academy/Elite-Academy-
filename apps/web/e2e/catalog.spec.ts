import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

const cards = (page: Page) =>
  page.getByRole('main').getByRole('article').getByRole('heading', { level: 3 });

test.describe('course catalog (spec §3.2)', () => {
  test('lists every program, starting soonest, without prices', async ({ page }) => {
    await page.goto('/en/courses');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Course catalog');
    await expect(page.getByText('3 programs')).toBeVisible();
    await expect(cards(page)).toHaveText([
      'Data Analysis with AI',
      'DevOps',
      'Full Stack Advanced with AI',
    ]);
    await expect(page.getByRole('main')).not.toContainText('₪');
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Courses', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('cards link to enroll (program preselected) and to course details', async ({ page }) => {
    await page.goto('/en/courses');
    await expect(
      page.getByRole('link', { name: /^Enroll\W+Data Analysis with AI$/ }),
    ).toHaveAttribute('href', '/en/enroll?program=data-analysis-ai');
    await expect(
      page.getByRole('link', { name: /^More details\W+Data Analysis with AI$/ }),
    ).toHaveAttribute('href', '/en/courses/data-analysis-ai');
  });

  test('filters update instantly, are written to the URL, and can be shared', async ({ page }) => {
    await page.goto('/en/courses');
    const filters = page.getByRole('complementary', { name: 'Filters' });
    await filters.getByRole('button', { name: 'Data', exact: true }).click();
    await filters.getByRole('button', { name: 'Web development' }).click();

    await expect(page.getByText('2 programs')).toBeVisible();
    await expect(page).toHaveURL(/\/en\/courses\?subject=web&subject=data$/);

    // Opening the shared URL shows the same filtered list on first render.
    await page.goto('/en/courses?subject=devops');
    await expect(cards(page)).toHaveText(['DevOps']);
    await expect(filters.getByRole('button', { name: 'DevOps' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('search and sort', async ({ page }) => {
    await page.goto('/en/courses');
    await page.getByLabel('Search programs').fill('dania');
    await expect(cards(page)).toHaveText(['Full Stack Advanced with AI']);

    await page.getByLabel('Search programs').fill('');
    await page.getByLabel('Sort by').selectOption('name');
    await expect(cards(page)).toHaveText([
      'Data Analysis with AI',
      'DevOps',
      'Full Stack Advanced with AI',
    ]);
    await expect(page).toHaveURL(/sort=name/);
  });

  test('empty state offers to clear the filters', async ({ page }) => {
    await page.goto('/en/courses?subject=data&level=advanced');
    await expect(page.getByText('No programs match')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByText('3 programs')).toBeVisible();
    await expect(page).toHaveURL(/\/en\/courses$/);
  });

  test('career advice box and breadcrumb', async ({ page }) => {
    await page.goto('/en/courses');
    await expect(
      page.getByRole('link', { name: /Not sure which level fits/ }).first(),
    ).toHaveAttribute('href', '/en/mentoring?tab=career');
    await expect(
      page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Home' }),
    ).toHaveAttribute('href', '/en');
  });

  test('has no automatically detectable accessibility issues (en, ar)', async ({ page }) => {
    for (const path of ['/en/courses', '/ar/courses?level=beginner']) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});

test.describe('course catalog on a phone @mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile layout only');

  test('filters open in a bottom sheet and apply only on "Apply"', async ({ page }) => {
    await page.goto('/en/courses');
    await page.getByRole('button', { name: 'Filters' }).click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await sheet.getByRole('button', { name: 'Beginner' }).click();
    await expect(page.getByText('3 programs')).toBeAttached(); // not applied yet

    await sheet.getByRole('button', { name: 'Apply' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText('1 program', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filters (1)' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
