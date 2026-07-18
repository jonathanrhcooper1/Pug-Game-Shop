import { test, expect } from '@playwright/test';

const publicPages = [
  { name: 'Home', path: '/', expectedStatuses: [200] },
  { name: 'Singles', path: '/shop-singles/', expectedStatuses: [200] },
  { name: 'Sealed', path: '/shop-sealed/', expectedStatuses: [200, 301, 302] },
  { name: 'Graded', path: '/shop-graded/', expectedStatuses: [200, 301, 302] },
  { name: 'Accessories', path: '/shop-accessories/', expectedStatuses: [200, 301, 302] },
  { name: 'Events', path: '/events/', expectedStatuses: [200] },
  { name: 'Buying', path: '/buying/', expectedStatuses: [200, 301, 302] },
  { name: 'Contact', path: '/contact/', expectedStatuses: [200] },
  { name: 'Cart', path: '/cart/', expectedStatuses: [200] },
  { name: '404', path: '/codex-production-readiness-missing-page/', expectedStatuses: [404] },
];

const forbiddenVisiblePhrases = [
  /STAGING/i,
  /TEST MODE/i,
  /localhost/i,
  /lorem ipsum/i,
  /placeholder/i,
  /\bTODO\b/i,
];

test.describe('public production smoke and copy guard', () => {
  for (const publicPage of publicPages) {
    test(`${publicPage.name} page loads without public debug/staging copy`, async ({ page }) => {
      const response = await page.goto(publicPage.path, { waitUntil: 'domcontentloaded' });
      expect(response, `${publicPage.name} returned no response`).not.toBeNull();
      expect(publicPage.expectedStatuses).toContain(response?.status());

      await expect(page.locator('body')).not.toContainText(/critical error|fatal error|uncaught exception/i);

      const visibleText = await page.locator('body').innerText();
      for (const phrase of forbiddenVisiblePhrases) {
        expect(visibleText, `${publicPage.name} rendered forbidden public phrase ${phrase}`).not.toMatch(phrase);
      }

      const rawShortcodes = await page.locator('body').innerText();
      expect(rawShortcodes, `${publicPage.name} rendered a raw TCG shortcode`).not.toMatch(/\[tcg_[^\]]+\]/i);

      const riskyLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .map((link) => link.href)
          .filter((href) => /localhost|127\.0\.0\.1|\.myftpupload\.com\/wp-admin|staging/i.test(href)),
      );
      expect(riskyLinks, `${publicPage.name} exposed staging/local/admin links`).toEqual([]);
    });
  }

  test('events list links to event detail registration page without embedding forms in listing cards', async ({ page }) => {
    await page.goto('/events/', { waitUntil: 'domcontentloaded' });
    const eventCards = page.locator('.tcg-event-card');
    const cardCount = await eventCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(0);

    if (cardCount === 0) {
      await expect(page.locator('body')).toContainText(/No upcoming events/i);
      return;
    }

    await expect(page.locator('.tcg-event-card form')).toHaveCount(0);
    const firstCardLink = eventCards.locator('.tcg-event-card__link');
    await expect(firstCardLink).toHaveCount(cardCount);

    const href = await firstCardLink.first().getAttribute('href');
    expect(href, 'event card should link to a detail page').toContain('tcg_event=');
  });
});
