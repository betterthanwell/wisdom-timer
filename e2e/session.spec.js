import { test, expect } from '@playwright/test';

// Record which sounds the app plays (by file path), keeping them silent.
// Real play() still runs so the app's audio logic behaves normally; if a
// browser can't decode the file, the app just logs an error.
const recordSounds = () => {
  window.__sounds = [];
  const realPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    window.__sounds.push(new URL(this.src, location.href).pathname);
    this.muted = true;
    return realPlay.apply(this, args);
  };
};

const soundsPlayed = (page) => page.evaluate(() => window.__sounds);
const countSound = async (page, name) => (await soundsPlayed(page)).filter((path) => path.includes(name)).length;

// Advance the fake clock in 1-minute jumps. fastForward fires each due timer
// once per jump (like a throttled background tab) instead of every 100ms
// tick, which keeps long sessions fast; React re-renders between jumps.
const passSeconds = async (page, seconds) => {
  for (let left = seconds; left > 0; left -= 60) {
    await page.clock.fastForward(Math.min(60, left) * 1000);
  }
};
const passMinutes = (page, minutes) => passSeconds(page, minutes * 60);

const setDuration = async (page, minutes, seconds = 0) => {
  await page.getByLabel('Minutes', { exact: true }).fill(String(minutes));
  await page.getByLabel('Seconds', { exact: true }).fill(String(seconds));
};

const START = new Date('2026-09-24T08:00:00');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(recordSounds);
  await page.clock.install({ time: START });
  await page.goto('/');
  // Freeze the clock so time only moves when a test moves it - otherwise real
  // time keeps flowing on top, and slow CI machines see e.g. 08:59 for 09:00.
  // Jumping ahead also lets sound loading's 2s fallback timeouts fire.
  await page.clock.pauseAt(new Date(START.getTime() + 60 * 60 * 1000));
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
});

test('a full 45-minute session: start bell, countdown, end bell', async ({ page }) => {
  await expect(page.getByText('45:00')).toBeVisible();

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Meditating...')).toBeVisible();
  expect(await countSound(page, 'bell-start')).toBe(1);
  // The frozen clock reads 09:00 at Start
  await expect(page.getByText(/^Ends at 09:45/)).toBeVisible();

  await passMinutes(page, 20);
  await expect(page.getByText('25:00')).toBeVisible();

  await passMinutes(page, 25);
  await expect(page.getByText('Complete')).toBeVisible();
  await expect(page.getByText('00:00')).toBeVisible();
  expect(await countSound(page, 'bell-end')).toBe(1);
});

test('the interval woodblock starts after its own time, repeats, and skips the end', async ({ page }) => {
  await page.getByRole('switch', { name: 'Interval woodblock' }).click();
  await page.getByLabel('Interval in minutes').fill('5');
  await page.getByLabel('Starting after, in minutes').fill('2');
  await setDuration(page, 17);

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await passMinutes(page, 17);

  await expect(page.getByText('Complete')).toBeVisible();
  expect(await countSound(page, 'bell-interval')).toBe(3); // 2, 7 and 12 min - not 17
  expect(await countSound(page, 'bell-end')).toBe(1);
});

test('pausing holds the time; resuming rings the start bell and finishes on schedule', async ({ page }) => {
  await setDuration(page, 10);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await passMinutes(page, 1);

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('Paused')).toBeVisible();
  // Nothing should happen while paused, so jump straight over half an hour
  await page.clock.fastForward('30:00');
  await expect(page.getByText('09:00')).toBeVisible();

  // Duration is locked while paused
  await expect(page.getByLabel('Minutes', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '30m' })).toBeDisabled();

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  expect(await countSound(page, 'bell-start')).toBe(2);

  await passMinutes(page, 9);
  await expect(page.getByText('Complete')).toBeVisible();
});

test('Play after a finished session starts session 2', async ({ page }) => {
  await setDuration(page, 1);
  await expect(page.getByText('Session 1')).toBeVisible();

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await passMinutes(page, 1);
  await expect(page.getByText('Complete')).toBeVisible();

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Meditating...')).toBeVisible();
  await expect(page.getByText('Session 2')).toBeVisible();
  await expect(page.getByText('01:00')).toBeVisible();
});

test('quiet screen: settings hide while running and come back on request', async ({ page }) => {
  const settingsHeading = page.getByRole('heading', { name: 'Settings' });
  await expect(settingsHeading).toBeVisible();

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(settingsHeading).toBeHidden();

  await page.getByRole('button', { name: 'Show settings' }).click();
  await expect(settingsHeading).toBeVisible();

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: /settings$/ })).toBeHidden();
});

test('settling in: a silent countdown, then the start bell', async ({ page }) => {
  await page.getByRole('button', { name: 'Settle in for 20s' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  await expect(page.getByText('Settling in…')).toBeVisible();
  await expect(page.getByText('00:20')).toBeVisible();
  expect(await countSound(page, 'bell-start')).toBe(0);

  await passSeconds(page, 20);
  await expect(page.getByText('Meditating...')).toBeVisible();
  expect(await countSound(page, 'bell-start')).toBe(1);
});

test('bell patterns: three strikes to begin, five seconds apart', async ({ page }) => {
  // The strike choices are tucked away behind a switch
  await page.getByRole('switch', { name: 'Show bell strikes' }).click();
  await page.getByRole('button', { name: 'Start bell: 3 strikes' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  expect(await countSound(page, 'bell-start')).toBe(1);

  await page.clock.runFor(5_000);
  expect(await countSound(page, 'bell-start')).toBe(2);
  await page.clock.runFor(5_000);
  expect(await countSound(page, 'bell-start')).toBe(3);
});

test('open-ended sitting: counts up until Finish', async ({ page }) => {
  await page.getByRole('switch', { name: 'Open-ended sitting' }).click();
  await expect(page.getByText('00:00')).toBeVisible();

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await passMinutes(page, 20);
  await expect(page.getByText('20:00')).toBeVisible();

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText('Complete')).toBeVisible();
  await expect(page.getByText('20:00')).toBeVisible();
  expect(await countSound(page, 'bell-end')).toBe(1);
});

test('ambient sound starts with the session', async ({ page }) => {
  await page.getByRole('button', { name: 'Rain' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await passSeconds(page, 1);

  expect(await countSound(page, 'ambient/rain')).toBe(1);
});

test('keyboard: Space starts and pauses, R resets', async ({ page }) => {
  await page.keyboard.press('Space');
  await expect(page.getByText('Meditating...')).toBeVisible();

  await page.keyboard.press('Space');
  await expect(page.getByText('Paused')).toBeVisible();

  await page.keyboard.press('r');
  await expect(page.getByText('Ready')).toBeVisible();
  await expect(page.getByText('45:00')).toBeVisible();
});

test('settings survive a reload', async ({ page }) => {
  await page.getByRole('button', { name: '30m' }).click();
  await expect(page.getByText('30:00')).toBeVisible();

  await page.reload();
  await page.clock.runFor(2500); // sound loading fallback timeouts
  await expect(page.getByText('30:00')).toBeVisible();
});
