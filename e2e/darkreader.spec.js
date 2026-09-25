import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

// Dark Reader - the extension, and the night mode Firefox for iOS builds on -
// repaints pages dark. Here that hid the switches and slider tracks (faint
// white tints on a near-black page) and turned the warm gradient black, so
// the page opts out with <meta name="darkreader-lock">.
const darkReaderScript = createRequire(import.meta.url).resolve('darkreader/darkreader.js');

// Dark Reader is injected like an extension would be, past the page's CSP
test.use({ bypassCSP: true });

test('Dark Reader leaves the page alone', async ({ page }) => {
  await page.goto('/');
  const pageRoot = page.locator('#root > div').first();
  const before = await pageRoot.evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(before).toContain('gradient');

  await page.addScriptTag({ path: darkReaderScript });
  await page.evaluate(() => window.DarkReader.enable());
  // Dark Reader styles the page asynchronously
  await page.waitForTimeout(1000);

  expect(await page.locator('style.darkreader').count()).toBe(0);
  expect(await pageRoot.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe(before);
});
