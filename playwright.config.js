import { defineConfig, devices } from '@playwright/test';

// End-to-end tests: the production build in real browser engines.
// Run with `npm run test:e2e` (builds first).

// Tests tagged @webaudio check that bells ring through Web Audio. Headless
// WebKit pages playing at the same time take each other's audio away (the
// context turns "interrupted", and bells rightly fall back to <audio>), so in
// WebKit these run in their own projects: one at a time, once everything else
// has finished.
const WEB_AUDIO = /@webaudio/;
const MAIN_PROJECTS = ['chromium', 'firefox', 'webkit', 'mobile-safari'];

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
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // Safari's engine
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grepInvert: WEB_AUDIO },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] }, grepInvert: WEB_AUDIO },
    // (Run one of these alone with --no-deps)
    { name: 'webkit-audio', use: { ...devices['Desktop Safari'] }, grep: WEB_AUDIO, workers: 1, dependencies: MAIN_PROJECTS },
    { name: 'mobile-safari-audio', use: { ...devices['iPhone 15'] }, grep: WEB_AUDIO, workers: 1, dependencies: ['webkit-audio'] },
  ],

  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
