import { test, expect } from '@playwright/test';
import { recordSounds, countSound, soundLog, reportSoundsOnFailure } from './sounds';

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

reportSoundsOnFailure(test);

const START = new Date('2026-09-24T08:00:00');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(recordSounds);
  await page.clock.install({ time: START });
  await page.goto('/');
  // Freeze the clock so time only moves when a test moves it - otherwise real
  // time keeps flowing on top, and slow CI machines see e.g. 08:59 for 09:00.
  // Jumping ahead also lets sound loading's 2s fallback timeouts fire -
  // unless the app set them up after the jump; then Start waits for the bells
  // to be decoded, which can take several seconds in busy parallel runs.
  await page.clock.pauseAt(new Date(START.getTime() + 60 * 60 * 1000));
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled({ timeout: 20_000 });
});

test('a full 45-minute session: start bell, countdown, end bell', async ({ page }) => {
  await expect(page.getByText('45:00')).toBeVisible();

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Meditating...')).toBeVisible();
  await expect.poll(() => countSound(page, 'bell-start')).toBe(1);
  // The frozen clock reads 09:00 at Start
  await expect(page.getByText(/^Ends at 09:45/)).toBeVisible();

  await passMinutes(page, 20);
  await expect(page.getByText('25:00')).toBeVisible();

  await passMinutes(page, 25);
  await expect(page.getByText('Complete')).toBeVisible();
  await expect(page.getByText('00:00')).toBeVisible();
  await expect.poll(() => countSound(page, 'bell-end')).toBe(1);
});

test('after the Start tap, the woodblock and end bell ring through unlocked Web Audio', async ({ page }) => {
  // Bells decoded (until then they'd ring on <audio> elements)
  await expect.poll(() => page.evaluate(() => window.__decodedSounds), { timeout: 30_000 }).toBe(3);
  await page.getByRole('switch', { name: 'Interval woodblock' }).click();
  await page.getByLabel('Interval in minutes').fill('1');
  await page.getByLabel('Starting after, in minutes').fill('1');
  await setDuration(page, 2);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  // (The start bell waits a moment for audio to resume, in real time; don't
  // let the fake clock jump past that)
  await expect.poll(() => countSound(page, 'bell-start')).toBe(1);
  await passMinutes(page, 2);
  await expect(page.getByText('Complete')).toBeVisible();

  const log = await soundLog(page);
  expect(log.map((entry) => entry.path)).toEqual([
    '/audio/bells/bell-start.mp3',
    '/audio/bells/bell-interval.mp3',
    '/audio/bells/bell-end.mp3',
  ]);
  // WebKit can take audio away from a page (iOS: a call, another app; in
  // parallel test runs: other test pages) - the context turns "interrupted"
  // and bells rightly fall back to <audio> elements. Otherwise:
  const states = await page.evaluate(() => window.__audioStates);
  test.skip(states.includes('interrupted'), `WebKit interrupted audio during the test (${states.join(' → ')})`);

  // Bells started by timers (no tap) must not depend on <audio> elements,
  // which iOS won't start without a tap
  expect(log).toEqual([
    { path: '/audio/bells/bell-start.mp3', via: 'webaudio', state: expect.stringMatching(/^(suspended|running)$/) },
    { path: '/audio/bells/bell-interval.mp3', via: 'webaudio', state: 'running' },
    { path: '/audio/bells/bell-end.mp3', via: 'webaudio', state: 'running' },
  ]);
});

test('the interval woodblock starts after its own time, repeats, and skips the end', async ({ page }) => {
  await page.getByRole('switch', { name: 'Interval woodblock' }).click();
  await page.getByLabel('Interval in minutes').fill('5');
  await page.getByLabel('Starting after, in minutes').fill('2');
  await setDuration(page, 17);

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await passMinutes(page, 17);

  await expect(page.getByText('Complete')).toBeVisible();
  await expect.poll(() => countSound(page, 'bell-interval')).toBe(3); // 2, 7 and 12 min - not 17
  await expect.poll(() => countSound(page, 'bell-end')).toBe(1);
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
  await expect.poll(() => countSound(page, 'bell-start')).toBe(2);

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

test('quiet screen: the dim covers the whole page, cards and text included - all but the glowing time and the metta phrase', async ({ page }) => {
  await page.getByRole('switch', { name: 'Metta mode' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  // Is the dim layer the topmost thing over the title and the controls? (It
  // ignores clicks, so let it take part in hit-testing just for the check.
  // Hit-testing only sees what's on screen, so bring each element into view.)
  const dimIsOnTop = (name) =>
    page.evaluate((selector) => {
      const dim = document.querySelector('[data-testid="quiet-dim"]');
      dim.style.pointerEvents = 'auto';
      const element = document.querySelector(selector);
      element.scrollIntoView({ block: 'center' });
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      dim.style.pointerEvents = '';
      return top === dim;
    }, name);

  expect(await dimIsOnTop('h1')).toBe(true);
  expect(await dimIsOnTop('[aria-label="Pause"]')).toBe(true);
  // The time and its glow (the nimitta), and the metta phrase, shine on above it
  expect(await dimIsOnTop('[data-testid="nimitta"]')).toBe(false);
  expect(await dimIsOnTop('[data-testid="metta-phrase"]')).toBe(false);
});

test('settling in: a silent countdown, then the start bell', async ({ page }) => {
  await page.getByRole('button', { name: 'Settle in for 20s' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  await expect(page.getByText('Settling in…')).toBeVisible();
  await expect(page.getByText('00:20')).toBeVisible();
  await expect.poll(() => countSound(page, 'bell-start')).toBe(0);

  await passSeconds(page, 20);
  await expect(page.getByText('Meditating...')).toBeVisible();
  await expect.poll(() => countSound(page, 'bell-start')).toBe(1);
});

test('bell patterns: three strikes to begin, five seconds apart', async ({ page }) => {
  // No strike choices on screen for now, but a saved choice still applies
  await page.evaluate(() => localStorage.setItem('wisdomTimerSettings', JSON.stringify({ startStrikes: 3 })));
  await page.reload();
  await page.clock.runFor(2500); // sound loading fallback timeouts
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(() => countSound(page, 'bell-start')).toBe(1);

  await page.clock.runFor(5_000);
  await expect.poll(() => countSound(page, 'bell-start')).toBe(2);
  await page.clock.runFor(5_000);
  await expect.poll(() => countSound(page, 'bell-start')).toBe(3);
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
  await expect.poll(() => countSound(page, 'bell-end')).toBe(1);
});

test('ambient sound: downloaded when chosen, then starts with the session', async ({ page }) => {
  const forest = page.getByRole('button', { name: 'Forest' });
  await forest.click();
  // Selected once it's on the device
  await expect(forest).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await passSeconds(page, 1);

  await expect.poll(() => countSound(page, 'ambient/forest')).toBe(1);
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

test('keyboard: Space presses a button reached with Tab, but starts the session after a click', async ({ page, browserName }) => {
  // Tabbed to the next preset: Space chooses it and doesn't start. (Safari's
  // Tab skips buttons unless "Press Tab to highlight each item" is on.)
  if (browserName !== 'webkit') {
    await page.getByRole('button', { name: '30m' }).click();
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Space');
    await expect(focused).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Ready')).toBeVisible();
  }

  // Clicked: Space is still Start
  await page.getByRole('button', { name: '30m' }).click();
  await page.keyboard.press('Space');
  await expect(page.getByText('Meditating...')).toBeVisible();
  await expect(page.getByText('30:00')).toBeVisible();
});

test('settings survive a reload', async ({ page }) => {
  await page.getByRole('button', { name: '30m' }).click();
  await expect(page.getByText('30:00')).toBeVisible();

  await page.reload();
  await page.clock.runFor(2500); // sound loading fallback timeouts
  await expect(page.getByText('30:00')).toBeVisible();
});

test('the keyboard hint shows with a mouse or trackpad, not on a touch screen', async ({ page, isMobile }) => {
  const hint = page.getByTestId('keyboard-hint');
  if (isMobile) {
    await expect(hint).toBeHidden();
  } else {
    await expect(hint).toBeVisible();
    await expect(hint).toHaveText(/Space\s*start \/ pause\s*·\s*R\s*reset/);
  }
});

test('metta mode: the phrases take turns above the timer while sitting', async ({ page }) => {
  await page.getByRole('switch', { name: 'Metta mode' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  const phrase = page.getByTestId('metta-phrase');
  await expect(phrase).toHaveText('May I be happy.');
  await page.clock.fastForward(10_000);
  await expect(phrase).toHaveText('May my loved ones be happy.');
  await page.clock.fastForward(30_000);
  await expect(phrase).toHaveText('May I be happy.');

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(phrase).toBeHidden();
});

test('guided meditation: start bell, the voice after the lead-in, end bell exactly when the recording ends', async ({ page }) => {
  await page.getByRole('switch', { name: 'Guided meditation' }).click();
  // Downloaded when chosen and kept on the device; Start waits for it
  await expect
    .poll(() => page.evaluate(() => caches.open('ambient-sounds-v1').then((cache) => cache.match('/audio/guided/metta.mp3')).then(Boolean)), { timeout: 30_000 })
    .toBe(true);
  const start = page.getByRole('button', { name: 'Start', exact: true });
  await expect(start).toBeEnabled();
  // 15 s lead-in + 248.576 s of recording
  await expect(page.getByText('04:24')).toBeVisible();

  await start.click();
  await expect.poll(() => countSound(page, 'bell-start')).toBe(1);
  // Primed (muted) in the tap, so it may start from the lead-in's timer (iOS)
  const primed = await countSound(page, 'guided/metta');

  await page.clock.fastForward(14_000);
  expect(await countSound(page, 'guided/metta')).toBe(primed);
  await page.clock.fastForward(1_000);
  await expect.poll(() => countSound(page, 'guided/metta')).toBe(primed + 1);
  expect(await page.evaluate(() => [...document.querySelectorAll('audio')].length)).toBe(0); // (not in the DOM)

  await passSeconds(page, 248);
  await page.clock.fastForward(575);
  await expect(page.getByText('Complete')).not.toBeVisible();
  expect(await countSound(page, 'bell-end')).toBe(0);
  await page.clock.fastForward(1);
  await expect(page.getByText('Complete')).toBeVisible();
  await expect.poll(() => countSound(page, 'bell-end')).toBe(1);
});
