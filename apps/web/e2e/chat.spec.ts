import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures';

async function openChat(page: Page) {
  await page.getByRole('button', { name: 'Chat with the Elite Tech assistant' }).click();
  const chat = page.getByRole('dialog', { name: 'Elite Tech assistant' });
  await expect(chat).toBeVisible();
  return { chat, log: chat.getByRole('log', { name: 'Conversation' }) };
}

test.describe('chat assistant (design "Chat assistant")', () => {
  test('greets, answers prices without program prices, and hands over to a person', async ({
    page,
    consoleErrors,
  }) => {
    await page.goto('/en');
    const { chat, log } = await openChat(page);
    await expect(log).toContainText('I’m the Elite Tech assistant');
    await expect(chat.getByRole('textbox', { name: 'Your question' })).toBeFocused();

    await chat.getByRole('button', { name: 'Prices & installments' }).click();
    await expect(log).toContainText('explained by an advisor in a free call');
    // Only mentoring prices (₪250 / ₪2,000) — programs never show a price.
    await expect(log).toContainText('₪250 for a single session, or ₪2,000 for an 8-session plan');

    await chat.getByRole('button', { name: 'Talk to a person' }).click();
    await expect(log.getByRole('link', { name: 'Write on WhatsApp' })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\//,
    );
    await expect(log.getByRole('link', { name: 'Ask for a call back' })).toHaveAttribute(
      'href',
      '/en/enroll',
    );

    // Escape closes it and focus goes back to the chat button.
    await page.keyboard.press('Escape');
    await expect(chat).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Chat with the Elite Tech assistant' }),
    ).toBeFocused();
    expect(consoleErrors).toEqual([]);
  });

  test('"Which program fits me?" asks two questions and links to programs', async ({ page }) => {
    await page.goto('/en/courses');
    const { chat, log } = await openChat(page);
    await chat.getByRole('button', { name: 'Which program fits me?' }).click();
    await expect(log).toContainText('How much experience do you have');
    await chat.getByRole('button', { name: 'Advanced' }).click();
    await expect(log).toContainText('what interests you most');
    await chat.getByRole('button', { name: 'Web development' }).click();
    await expect(log.getByRole('link', { name: 'Full Stack Advanced with AI' })).toHaveAttribute(
      'href',
      '/en/courses/full-stack-advanced-ai',
    );
  });

  test('understands typed questions: start dates and the FAQ', async ({ page }) => {
    await page.goto('/en');
    const { chat, log } = await openChat(page);
    const input = chat.getByRole('textbox', { name: 'Your question' });

    await input.fill('When does the next group start?');
    await input.press('Enter');
    await expect(log.getByRole('link', { name: 'Data Analysis with AI' })).toBeVisible();
    await expect(log).toContainText('Starts November 2');
    await expect(input).toHaveValue('');

    await input.fill('Do I need prior experience?');
    await chat.getByRole('button', { name: 'Send' }).click();
    await expect(log).toContainText('Not for beginner programs.');
  });

  test('works in Arabic and has no accessibility issues (en, ar)', async ({ page }) => {
    await page.goto('/ar');
    await page.getByRole('button', { name: 'تحدّث مع مساعد إيليت تك' }).click();
    const chat = page.getByRole('dialog', { name: 'مساعد إيليت تك' });
    const log = chat.getByRole('log', { name: 'المحادثة' });
    const input = chat.getByRole('textbox', { name: 'سؤالك' });
    await input.fill('ما هي الأسعار؟');
    await input.press('Enter');
    await expect(log).toContainText('مكالمة مجانية');
    await expectNoA11yViolations(page);

    await page.goto('/en');
    await openChat(page);
    await expectNoA11yViolations(page);
  });
});

test.describe('chat on a phone @mobile', () => {
  test('sits above the course page Enroll bar', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'phone layout only');
    await page.goto('/en/courses/full-stack-advanced-ai');
    const launcher = page.getByRole('button', { name: 'Chat with the Elite Tech assistant' });
    const bar = page.locator('[data-bottom-bar]');
    const [button, barBox] = [await launcher.boundingBox(), await bar.boundingBox()];
    expect(button!.y + button!.height).toBeLessThanOrEqual(barBox!.y);
  });
});
