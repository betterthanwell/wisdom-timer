import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, preview } from 'vite';
import { recordSounds, countSound, failedPlays } from './sounds';

// Offline use: after one visit, the app opens and works without a network
// (airplane mode, no signal) - served by the service worker.
//
// To take the network away, the test serves the build itself and then shuts
// that server down. Playwright's own ways (context.setOffline, route) cut
// WebKit off before its service worker can answer, and also block media
// from memory there.
const serveBuild = async ({ outDir = 'dist', port = 0 } = {}) => {
  const server = await preview({ logLevel: 'silent', build: { outDir }, preview: { host: '127.0.0.1', port, strictPort: true } });
  const address = server.httpServer.address();
  return {
    port: address.port,
    url: `http://127.0.0.1:${address.port}/`,
    stop: async () => {
      server.httpServer.closeAllConnections();
      await server.close();
    },
  };
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(recordSounds);
});

// Wait until the service worker has cached everything (it is active only
// once its install - the caching - has finished)
const waitUntilAvailableOffline = (page) =>
  page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration.active);
  });

test('after one visit, the app opens offline and Space starts a session with its bell', async ({ page }) => {
  const server = await serveBuild();
  await page.goto(server.url);
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  expect(await waitUntilAvailableOffline(page)).toBe(true);

  await server.stop();
  await page.reload();
  // Really offline: anything not kept on the device can't be fetched
  const ambient = await page.evaluate(() => fetch('/audio/ambient/rain.mp3').then(() => 'fetched', () => 'unreachable'));
  expect(ambient).toBe('unreachable');

  await expect(page.getByRole('heading', { name: 'Wisdom Timer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  await page.keyboard.press('Space');
  await expect(page.getByText('Meditating...')).toBeVisible();

  // The start bell came from the offline copy, and really played
  expect(await countSound(page, 'bell-start')).toBe(1);
  expect(await failedPlays(page, 1)).toEqual([]);
});

test('the app can be installed: it has a web app manifest with icons', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href)).json();

  expect(manifest).toMatchObject({ name: 'Wisdom Timer', start_url: '/', display: 'standalone' });
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok(), icon.src).toBe(true);
  }
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});

// A build of the app whose page title is `title`, in a temporary folder
const buildWithTitle = async (title) => {
  const outDir = mkdtempSync(join(tmpdir(), 'wisdom-timer-build-'));
  await build({
    logLevel: 'silent',
    build: { outDir, emptyOutDir: true },
    plugins: [{ name: 'title', transformIndexHtml: (html) => html.replace(/<title>.*<\/title>/, `<title>${title}</title>`) }],
  });
  return outDir;
};

test('a new deploy reaches the device, and the old offline copy is removed', async ({ page }) => {
  const oldBuild = await buildWithTitle('Old version');
  const newBuild = await buildWithTitle('New version');
  try {
    const oldServer = await serveBuild({ outDir: oldBuild });
    await page.goto(oldServer.url);
    expect(await waitUntilAvailableOffline(page)).toBe(true);
    const oldCaches = await page.evaluate(() => caches.keys());
    expect(oldCaches).toHaveLength(1);

    // Deploy: the same address now serves the new build
    await oldServer.stop();
    const newServer = await serveBuild({ outDir: newBuild, port: oldServer.port });
    try {
      // The first load after a deploy still shows the kept version, while the
      // browser picks up the new service worker, which takes over right away
      await page.reload();
      await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 10_000 }).not.toEqual(oldCaches);
      await expect.poll(() => page.evaluate(() => caches.keys())).toHaveLength(1);

      await page.reload();
      await expect(page).toHaveTitle('New version');
    } finally {
      await newServer.stop();
    }
  } finally {
    rmSync(oldBuild, { recursive: true, force: true });
    rmSync(newBuild, { recursive: true, force: true });
  }
});
