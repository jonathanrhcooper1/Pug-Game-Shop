import { test, expect } from '@playwright/test';

test('admin system status page is reachable in local test environments', async ({ page }) => {
  await page.goto('/wp-admin/admin.php?page=tcg-store-platform-status');
  await expect(page.locator('body')).toContainText('TCG Store Platform');
});
