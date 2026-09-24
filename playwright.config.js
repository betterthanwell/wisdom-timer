import { defineConfig, devices } from '@playwright/test';

// End-to-end tests: the production build in real browser engines.
// Run with `npm run test:e2e` (builds first).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Safari's engine
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
  ],

  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
