import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test as base } from '@playwright/test';

/**
 * Browser-side API calls are mocked per test with page.route (the /api proxy
 * target is fixed when the app is built). The notification bell polls on every
 * signed-in page, so it gets a quiet default here; a test can register its own
 * routes afterwards, which take priority.
 */
async function quietNotifications(page: Page) {
  await page.route(
    (url) => url.pathname === '/api/notifications',
    (route) => route.fulfill({ json: { items: [], unread: 0 } }),
  );
  await page.route(
    (url) => url.pathname === '/api/notifications/stream',
    (route) =>
      route.fulfill({
        headers: { 'content-type': 'text/event-stream' },
        // No events; ask the browser to wait a long time before reconnecting.
        body: 'retry: 600000\n\n',
      }),
  );
}

/** Fails the test if the page logs a CSP violation or any other console error. */
export const test = base.extend<{ consoleErrors: string[]; quietBell: undefined }>({
  quietBell: [
    async ({ page }, use) => {
      await quietNotifications(page);
      await use(undefined);
    },
    { auto: true },
  ],
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await use(errors);
  },
});

export { expect };

/** WCAG 2.2 AA automated checks (spec §10). Manual testing is still needed for full conformance. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
  expect(summary).toEqual([]);
}
