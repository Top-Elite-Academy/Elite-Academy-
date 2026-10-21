import { expect, expectNoA11yViolations, test } from './fixtures';

const PAGE = '/en/courses/full-stack-advanced-ai';

test.describe('course details (spec §3.3)', () => {
  test('shows the program with its key facts, sections and no price', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Full Stack Advanced with AI');
    const hero = page.locator('section[aria-labelledby="course-title"]');
    await expect(hero).toContainText('24 weeks');
    await expect(hero).toContainText('Live online meetings');
    await expect(
      page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Courses' }),
    ).toHaveAttribute('href', '/en/courses');

    for (const title of [
      'Overview',
      'What you’ll learn',
      'Curriculum',
      'Schedule and upcoming cohorts',
      'How you access the lessons',
      'Instructor',
      'Course questions',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
    await expect(page.getByRole('main')).not.toContainText('₪');
  });

  test('tabs link to each section', async ({ page }) => {
    await page.goto(PAGE);
    const tabs = page.getByRole('navigation', { name: 'On this page' });
    await expect(tabs.getByRole('link', { name: 'Curriculum' })).toHaveAttribute(
      'href',
      '#curriculum',
    );
    await tabs.getByRole('link', { name: 'Schedule' }).click();
    await expect(page).toHaveURL(/#schedule$/);
  });

  test('choosing a cohort changes the enroll link; a full cohort is disabled', async ({ page }) => {
    await page.goto(PAGE);
    const enroll = page
      .getByRole('complementary')
      .getByRole('link', { name: /Enroll — book a call/ });
    await expect(enroll).toHaveAttribute(
      'href',
      '/en/enroll?program=full-stack-advanced-ai&cohort=c1111111-1111-4111-8111-111111111111',
    );
    await expect(page.getByRole('radio', { name: /January cohort/ })).toBeDisabled();

    await page.getByRole('radio', { name: /March cohort/ }).check();
    await expect(enroll).toHaveAttribute(
      'href',
      '/en/enroll?program=full-stack-advanced-ai&cohort=c3333333-3333-4333-8333-333333333333',
    );
    await expect(page.getByRole('complementary')).toContainText('No payment now.');
  });

  test('curriculum opens the first unit and links to the full syllabus', async ({ page }) => {
    await page.goto(PAGE);
    const curriculum = page.locator('#curriculum');
    await expect(curriculum.locator('details').first()).toHaveAttribute('open', '');
    await expect(curriculum.getByText('Async/await')).toBeVisible();
    await expect(curriculum.getByRole('link', { name: 'View full syllabus' })).toHaveAttribute(
      'href',
      '/en/courses/full-stack-advanced-ai/syllabus',
    );
  });

  test('a program without curriculum or cohorts says so', async ({ page }) => {
    await page.goto('/en/courses/devops');
    await expect(page.locator('#curriculum')).toContainText('will be published soon');
    await expect(page.locator('#schedule')).toContainText('New dates will be announced soon');
    await expect(
      page.getByRole('complementary').getByRole('link', { name: /Enroll — book a call/ }),
    ).toHaveAttribute('href', '/en/enroll?program=devops');
  });

  test('unknown programs show the 404 page', async ({ page }) => {
    const response = await page.goto('/en/courses/does-not-exist');
    expect(response?.status()).toBe(404);
  });

  test('has no automatically detectable accessibility issues (en, ar)', async ({ page }) => {
    for (const path of [PAGE, '/ar/courses/full-stack-advanced-ai']) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});

test.describe('course details on a phone @mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile layout only');

  test('keeps an Enroll bar fixed at the bottom and fits the screen', async ({ page }) => {
    await page.goto(PAGE);
    await page.mouse.wheel(0, 3000);
    const bar = page.locator('.fixed.bottom-0');
    await expect(bar.getByRole('link', { name: 'Enroll — book a call' })).toBeInViewport();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
