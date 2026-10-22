import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const RANA = '11111111-1111-4111-8111-111111111111';
const PAGES = [
  '/en',
  '/ar',
  '/en/courses',
  '/en/courses/full-stack-advanced-ai',
  '/en/enroll',
  '/he/mentoring',
  `/en/book?service=mentoring-8&mentor=${RANA}`,
  '/en/login',
  '/ar/signup',
  '/en/accessibility',
];
/** Phone, tablet portrait, tablet landscape. */
const SIZES = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet landscape', width: 1024, height: 768 },
];

/** Floating buttons must never sit on top of a fixed bottom action bar. */
async function expectAboveBottomBar(page: Page) {
  const bars = page.locator('[data-bottom-bar]');
  if ((await bars.count()) === 0) return;
  const bar = await bars.first().boundingBox();
  for (const button of ['.chat-launcher', '.a11y-launcher']) {
    const launcher = page.locator(button);
    if ((await launcher.count()) === 0) continue;
    const box = await launcher.boundingBox();
    if (bar && box) expect(box.y + box.height, button).toBeLessThanOrEqual(bar.y);
  }
}

for (const size of SIZES) {
  test(`every page fits a ${size.name} screen (${size.width}px)`, async ({ page }) => {
    // Ten page loads in one test: allow the longer "slow test" time under parallel load.
    test.slow();
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
      await expectAboveBottomBar(page);
    }
  });
}
