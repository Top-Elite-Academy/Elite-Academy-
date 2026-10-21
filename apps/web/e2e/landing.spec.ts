import { expect, expectNoA11yViolations, test } from './fixtures';

test.describe('landing page (spec §3.1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
  });

  test('hero has both actions and says there is no payment to enroll', async ({ page }) => {
    const hero = page.locator('section[aria-labelledby="hero-title"]');
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(
      'Start your path into high tech, one clear step at a time',
    );
    await expect(hero.getByRole('link', { name: 'Explore courses' })).toHaveAttribute(
      'href',
      '/en/courses',
    );
    await expect(hero.getByRole('link', { name: 'Book a mentoring session' })).toHaveAttribute(
      'href',
      '/en/mentoring?tab=mentoring',
    );
    await expect(hero).toContainText('No payment to enroll');
  });

  test('top program cards link to course details and never show a price', async ({ page }) => {
    const section = page.locator('section[aria-labelledby="top-programs-title"]');
    await expect(section.getByRole('link', { name: 'Data Analysis with AI' })).toHaveAttribute(
      'href',
      '/en/courses/data-analysis-ai',
    );
    await expect(section).toContainText('Next cohort: November 2');
    await expect(section).toContainText('Next cohort: dates coming soon');
    await expect(section).not.toContainText('₪');
  });

  test('how it works step 02 goes to the enroll form', async ({ page }) => {
    const section = page.locator('section[aria-labelledby="how-title"]');
    await expect(section.getByRole('link', { name: /Enroll/ })).toHaveAttribute(
      'href',
      '/en/enroll',
    );
    await expect(section.getByRole('link', { name: /Go to the student area/ })).toHaveAttribute(
      'href',
      '/en/app',
    );
  });

  test('the featured instructor is selected first; focus or hover selects another', async ({
    page,
  }) => {
    const spotlight = page.getByRole('region', { name: 'Selected instructor' });
    await expect(spotlight.getByRole('heading', { level: 3 })).toHaveText('Dania Hih');

    const rana = page.getByRole('button', { name: /Rana Arafat/ });
    await rana.focus();
    await expect(rana).toHaveAttribute('aria-pressed', 'true');
    await expect(spotlight.getByRole('heading', { level: 3 })).toHaveText('Rana Arafat');
    await expect(spotlight.getByRole('link', { name: 'View the program' })).toHaveAttribute(
      'href',
      '/en/courses/data-analysis-ai',
    );

    await page.getByRole('button', { name: /Dania Hih/ }).hover();
    await expect(spotlight.getByRole('heading', { level: 3 })).toHaveText('Dania Hih');
  });

  test('FAQ keeps one question open at a time', async ({ page }) => {
    const faq = page.locator('#faq');
    const first = faq.locator('details').nth(0);
    const second = faq.locator('details').nth(1);

    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
    await expect(first).not.toHaveAttribute('open', '');
  });

  test('stories and FAQ are reachable by their anchors', async ({ page }) => {
    await expect(page.locator('#stories')).toContainText('Maya Rizk');
    await expect(page.locator('#faq')).toBeVisible();
  });

  test('closing call to action opens the booking flow with career advice', async ({ page }) => {
    const section = page.locator('section[aria-labelledby="closing-title"]');
    await expect(section.getByRole('link', { name: 'Book career advice' })).toHaveAttribute(
      'href',
      '/en/book?service=career',
    );
  });

  test('has no automatically detectable accessibility issues in Hebrew', async ({ page }) => {
    await page.goto('/he');
    await expectNoA11yViolations(page);
  });
});

test.describe('landing page on a phone @mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile layout only');

  test('does not scroll sideways', async ({ page }) => {
    for (const path of ['/en', '/ar']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    }
  });
});
