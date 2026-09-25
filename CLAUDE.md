# CLAUDE.md - AI Assistant Guide for Wisdom Timer

## Project Overview

Wisdom Timer is a meditation timer web app (React 19, Vite 8, Tailwind 4): bells at start, at intervals and at the end, looping ambient sounds, a glass-morphism UI on a warm gradient, and an "enlightenment burst" animation on completion. Deployed on Vercel.

**Live:** https://wisdomtimer.app/

## Quick Commands

```bash
npm install          # Install dependencies (Node 22.12+; 24 LTS recommended)
npm run dev          # Dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Serve the production build
npm run lint         # ESLint
npm test             # Vitest, once (~7 s)
npm run test:watch   # Vitest, watch mode
npm run test:e2e     # Playwright: builds, then Chromium / WebKit / iPhone profile
```

## Project Structure

```
├── src/
│   ├── App.jsx                  # Session flow, keyboard shortcuts, layout (default export)
│   ├── App.test.jsx             # Component tests: whole app, audioManager mocked
│   ├── main.jsx                 # Entry point (StrictMode)
│   ├── index.css                # Global styles, .glass-card(-strong), keyframes, reduced motion
│   ├── components/
│   │   ├── Timer/               # TimerDisplay (time, status, "Session N", burst),
│   │   │                        # TimerControls (Start/Pause|Cancel/Finish/Reset), CircularProgress, MettaCard
│   │   ├── Settings/            # PresetButtons, DurationSelector, IntervalSettings,
│   │   │                        # AmbientSoundSelector (+ iconMap), VolumeControls, KeepAwakeSetting, SettleSetting, BellPatternSettings, GentleEndingSetting, OpenEndedSetting, MettaSetting
│   │   └── UI/                  # GlassCard, Button (`round` for circles), Switch (on/off toggle with accessible name),
│   │                            # SettingLabel (icon + setting name), ChoiceButton (option with aria-pressed)
│   ├── hooks/
│   │   ├── useTimer.js          # Countdown from the clock, pause/resume, interval bells, wake-ups
│   │   ├── useAudio.js          # React wrapper around the audioManager singleton
│   │   ├── useSessionCounter.js # Sessions completed today (memory only, resets daily)
│   │   ├── useWakeLock.js       # Keeps the screen on (Screen Wake Lock API) while active
│   │   ├── useSettleCountdown.js # Settling-in countdown before a new session
│   │   └── useLocalStorage.js   # Persisted state
│   ├── context/
│   │   ├── TimerContext.jsx     # TimerProvider: settings reducer + saving to localStorage
│   │   └── useTimerContext.js   # Context object + useTimerContext hook (own file for fast refresh)
│   ├── utils/
│   │   ├── audioManager.js      # AudioManager class + singleton: bells, ambient, fades, volume
│   │   ├── intervalBells.js     # countIntervalBellsDue() - pure bell scheduling
│   │   ├── gentleEnding.js      # gentleEndingLevel() - ambient level over the last minute
│   │   ├── metta.js             # METTA_PHRASES + mettaStep() - which phrase shows when
│   │   ├── settings.js          # sanitizeSettings() - validates saved settings
│   │   └── timeFormatter.js     # formatTime (MM:SS) etc.
│   └── constants/
│       └── audioSources.js      # AUDIO_SOURCES (paths) + AMBIENT_SOUNDS (buttons)
├── e2e/session.spec.js          # Playwright end-to-end tests
├── public/audio/bells|ambient/  # Sound files (see Audio below)
├── .github/workflows/           # ci.yml (lint, test, build), e2e.yml (Playwright)
├── index.html                   # HTML shell + CSP meta tags
├── vercel.json                  # HTTP security headers (the effective ones)
├── vite.config.js               # Vite + Vitest config
├── playwright.config.js         # Playwright config (vite preview on :4173)
├── eslint.config.js             # Flat config; Node globals for Playwright files
├── postcss.config.js            # @tailwindcss/postcss
└── LICENSE                      # MIT
```

## Session Behavior (decided by the owner)

The owner works out the desired behavior by live-testing, so these can change - but don't "fix" them without asking:

- **Start bell rings on every start, including resume** after a pause.
- **Duration (presets + custom) is locked while running and while paused**, greyed out; Reset unlocks it.
- **Interval bell settings**: locked while running, usable while paused (left open for now).
- **Interval woodblock** (the UI's name for interval bells): "Hit the woodblock every N minutes" (`intervalDuration`, 1-30 min, default 10) and "Starting after N minutes" (`intervalStart`, 1-60 min, default 5) - the first knock comes at the start time, then every interval (default: 5, 15, 25 …). Code and settings keys still say "interval bell".
- **Volume sliders** are always usable.
- **Ambient sound choice** is always usable: *None* stops the sound immediately; another sound switches right away while running, or starts on resume while paused.
- **Play after a completed session starts a new full session** (no Reset needed).
- **"Session N"** shows the session you're on today: completed count + 1, or the just-completed number while "Complete" shows. Memory only; starts over on reload and on a new day. Resets don't count.
- Start is disabled for a 0:00 duration.
- **"Ends at HH:MM"** shows under the timer only while running (hidden when paused, since the end moves); locale time format via `formatClockTime()`.
- **Quiet screen**: while running, the settings card and keyboard hint are hidden and the page dims (`quiet-dim` overlay); "Show settings" (`aria-expanded`) reveals them and lifts the dim for that run. Paused/stopped shows everything; every start begins quiet again.
- **Settling in** (`settleSeconds`: 0/10/20/30/60, default 0 = off): only before a *new* session (from Ready or after completion), never on resume. Silent countdown ("Settling in…"), then the normal start. Counts as in-session: quiet screen, wake lock, duration locked. The main button becomes **Cancel**; Cancel, Space and Reset return to Ready. On completion it calls the *latest* `startTimer` via a ref, so changes made while settling (e.g. ambient sound) apply.
- **Bell patterns**: `startStrikes`, `intervalStrikes`, `endStrikes` (1-3, default 1). Strikes are 5 s apart for start/end bowls, 2 s for the interval woodblock (`BELL_STRIKE_SPACING_MS`). Reset cancels strikes not yet rung; pause doesn't. The "Bell strikes" section is always shown (whether interval bells are on or off); its switch (`showBellStrikes`, default off, saved) shows/hides the 1×/2×/3× choices. Hiding is UI only: saved strike counts - including start/end - keep applying.
- **Gentle ending** (`gentleEnding`, default off): while running, the ambient level follows `gentleEndingLevel()` - full until the last minute (or the last half of sessions under 2 min), then linearly to 0. Applied as `audioManager.setAmbientLevel()`, a multiplier separate from the volume slider; back to 1 whenever it doesn't apply.
- **Metta mode** (`mettaMode`, default off; `mettaSeconds` 5/10/20/30, default 10): while a session is running or paused, a separate `MettaCard` above the timer card shows one of the four `METTA_PHRASES` (oneself → loved ones → those I find difficult → all beings everywhere), then back to the first. Which phrase is derived from the time sat (`mettaStep()`), so pause holds it and resume carries on. Each phrase fades in, holds and fades out over its time (`mettaFlash` keyframes, frozen while paused; no animation with reduced motion). Hidden when Ready, settling in and after Reset. The card has a fixed height so the timer doesn't jump between one- and three-line phrases.
- **Open-ended sitting** (`openEnded`, default off): the timer runs as a countdown from 24 h (`OPEN_ENDED_SECONDS` in `App.jsx`) but displays the time sat (counting up); no progress ring, "Ends at" or gentle ending. **Finish** (`useTimer.finish()`) completes early - end bell, burst, session counted - and keeps the time sat on screen; Play then starts from 00:00. Presets/custom duration are greyed out while it's on; the switch itself is locked during a session.
- **Keep screen awake** (default on): a wake lock is held only while the timer is *running* (or settling in), not while paused. The toggle is hidden where the Wake Lock API isn't supported.
- Product direction: functional meditation features only - no streaks, stats, social sharing or similar engagement features.

## Architecture

### State
- **TimerContext** - `useReducer` for settings: `duration`, `presetDurations`, `intervalBellsEnabled`, `intervalDuration`, `intervalStart`, `selectedAmbient`, `ambientVolume`, `bellVolume`, `keepScreenAwake`. One generic `SET_SETTING` action (`{ key, value }`); named action functions (`setDuration`, `setKeepScreenAwake`, …) wrap it.
- Saved settings (`localStorage` key `wisdomTimerSettings`) seed the reducer's initial state through `sanitizeSettings()`, which keeps only valid values for known keys and uses defaults otherwise. Saving uses `pickSavedSettings()`: **every setting with a validator in `utils/settings.js` is saved, and nothing else.**
- Session state (running, paused, complete, time left) lives in `useTimer`, not the context.

### Timer (`useTimer`)
- Time left is computed from `expectedEndTimeRef` and `Date.now()`, never by decrementing, so it doesn't drift.
- Returns `timeRemaining`, `isRunning`, `isPaused`, `isComplete`, `endsAt` (end timestamp while running, else `null`), `progress`, `duration`, and `start`, `pause`, `reset`, `updateDuration`.
- A 100ms `setInterval` updates the display. Background tabs throttle it heavily (Chrome: down to once a minute), so the hook also schedules one-off `setTimeout` wake-ups at the end time and at each interval-bell time, and re-checks on `visibilitychange`. A `finished` guard prevents completing twice.
- `pause()` takes the time left from the clock, not the (possibly stale) displayed value.
- `start()` after completion begins a new full session. `finish()` completes a running or paused session early (open-ended sitting).
- Background wake-ups are only scheduled up to 6 hours ahead (`WAKE_UP_HORIZON_MS`), so a 24 h open-ended session with 1-minute bells doesn't create ~1,400 timeouts.
- Interval bells: `useTimer`'s 4th argument is `{ interval, firstAt, callback }` or `null`. `countIntervalBellsDue(elapsed, interval, duration, firstAt)` says how many bells are due - first at `firstAt` (default: one interval), then every `interval`, never at the end; the hook rings when the count goes up, so skipped ticks ring once. `start()` counts already-due bells as rung, so resuming doesn't ring a catch-up bell.

### Audio (`audioManager`)
- Singleton `AudioManager`; the class is also exported so tests can create isolated instances.
- `init()` is idempotent (React StrictMode mounts twice in dev) and delegates to `loadSounds()`: bells preload first (up to 2s each), then the ambient element is created. "Loading sounds…" shows and Start stays disabled until it's done.
- Each bell plays on a fresh `Audio` element (overlap allowed; `cloneNode()` didn't reliably keep volume). Ringing bells are tracked in `ringingBells`, so bell volume changes reach bells that are still ringing.
- Ambient: one looping element. `fade()` runs a fixed 20 steps over 500ms and always finishes, even where the browser ignores `volume` (iOS); the fade-in reads the target volume every step.
- `playAmbient(id)`: resumes if `id` is the current (paused) sound, otherwise switches. `currentAmbient` is set before `play()` and cleared as soon as a stop begins, so stopping while starting stays stopped.
- `playBell(type, strikes)` rings now and schedules later strikes (`pendingStrikes`); `cancelPendingBells()` drops the ones not yet rung. Each strike reads the current bell volume.
- `cleanup()` stops all playback (and pending strikes) but keeps loaded sounds.
- Sound files: bells are AAC in an MP4 container despite the `.mp3` names (browsers sniff content). Ambient files are long real recordings (10-36 min).

### Known platform limits
- iOS pauses JavaScript when the screen locks, so no timer runs until unlock; bells can't ring while locked.
- iOS Safari has historically ignored `HTMLMediaElement.volume`, so the sliders may do nothing there.
- The planned fix for both is the Web Audio API (pre-scheduled bells, gain nodes), pending a real-device check. Old attempt: branch `claude/locked-screen-audio-6Q8xo` (PR #7) - keep it.

### Security headers
`vercel.json` sets the real HTTP headers: CSP (incl. `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy. `index.html` repeats CSP and others as `<meta>` tags, but browsers ignore `frame-ancestors` and `X-Frame-Options` in meta tags - clickjacking protection comes from `vercel.json`. Keep both CSPs in sync; the CSP allows only same-origin scripts and media.

### Accessibility
- `prefers-reduced-motion` disables animations.
- Icon-only buttons and unlabeled inputs have `aria-label`s (Start/Pause/Reset, Minutes, Seconds, "Interval in minutes", "Starting after, in minutes"); the "Interval woodblock" toggle is `role="switch"` with `aria-checked`. Tests rely on these names.
- Keyboard: Space start/pause, R reset. Ignored while typing in inputs, and when Cmd/Ctrl/Alt is held (browser shortcuts like Cmd+R stay working). The hint under the settings (`data-testid="keyboard-hint"`) only shows where the main pointer is fine (`pointer-fine:` - mouse/trackpad), not on touch screens.
- Volume sliders are named "Bells volume" / "Sound volume"; choice buttons (settle time, strikes, presets, ambient sound) expose selection with `aria-pressed`.

## Code Conventions

- Components PascalCase `.jsx`; hooks `useX.js`; utils/constants camelCase.
- Functional components, props destructured in the signature, named exports (except `App`).
- Tailwind utility classes; custom CSS only in `index.css` (glass cards, keyframes). Inline styles for complex values (shadows, radial gradients).
- **Base CSS goes in `@layer base`.** Tailwind 4 puts utilities in cascade layers, and unlayered CSS beats any layer: a bare `* { padding: 0 }` once silently wiped out every `p-*`/`m-*`/`space-y-*` in the app. Tailwind's preflight already resets margins and box-sizing.
- Give a button one rounding class (`Button`'s `round` prop): conflicting ones like `rounded-xl rounded-full` resolve by stylesheet order, not class order.
- Settings rows: `SettingLabel` for the heading, `Switch` for on/off, `ChoiceButton` for options. The settings card is grouped into `<section>`s (duration, bells, sound, screen) divided by lines.
- Global settings via context actions; local UI state with `useState`; refs for values that mustn't re-render.
- Handlers passed to `useTimer` or used in effects are wrapped in `useCallback` - `useTimer`'s timer effect depends on `onComplete`, so an unstable callback would restart it every render.
- Lint must stay at zero errors and zero warnings (react-hooks rules include `set-state-in-effect` and exhaustive deps).

## Adding Features

### New ambient sound
1. Add the file to `public/audio/ambient/`.
2. In `src/constants/audioSources.js`, add it to **both** `AUDIO_SOURCES.ambient` (what plays; also what saved settings are validated against) and `AMBIENT_SOUNDS` (the buttons).
3. Add its icon to `iconMap` in `AmbientSoundSelector.jsx` (otherwise it falls back to a speaker icon).

### New bell sound
1. Add the file to `public/audio/bells/`.
2. Update `AUDIO_SOURCES.bells`, and the `bells` object in `AudioManager` if it's a new bell type.

### Background colors
The gradients are Tailwind arbitrary-value classes in `App.jsx` (`from-[#FDE68A] to-[#F97316]`, and a brighter one after completion).

### New setting
1. Add the default to `initialState` in `TimerContext.jsx`, and an action function that calls `setSetting('key', value)`.
2. Add a validator in `src/utils/settings.js` - that alone makes it saved and restored (unvalidated keys are neither).
3. Create the settings component (with an accessible name; use `UI/Switch` for on/off) and wire it in `App.jsx`.

## Testing

- **Vitest + jsdom + Testing Library**, configured in the `test` block of `vite.config.js`; only `src/**/*.test.{js,jsx}` is included.
- Tests live next to the code: `foo.js` → `foo.test.js`.
- Prefer pure functions (like `countIntervalBellsDue`, `sanitizeSettings`) and unit-test them.
- Hook tests: `renderHook` + `vi.useFakeTimers()`. Advance time in 1-second `act()` steps so React re-renders between ticks (one big `advanceTimersByTime` batches the updates and skips effects). Background throttling is simulated by stubbing `setInterval` out entirely.
- `audioManager.test.js` uses a `FakeAudio` class via `vi.stubGlobal('Audio', …)`, plus `FixedVolumeAudio` that ignores volume like iOS.
- `App.test.jsx` renders `<App />` with `audioManager` replaced by `vi.mock` spies and finds controls by accessible name. Some tests run a real 1-second session.
- Vitest globals are off, so Testing Library doesn't auto-clean: call `cleanup()` in `afterEach`.
- **Playwright** (`e2e/`): the production build in Chromium, WebKit and an iPhone 15 profile. First time: `npx playwright install chromium webkit`.
  - The page clock is faked **and frozen** (`clock.install()` then `clock.pauseAt()`); an unfrozen fake clock keeps flowing in real time, which made a test flaky on slow CI. Advance with `clock.fastForward` in 1-minute jumps; `runFor` fires every 100ms tick and is far too slow for long sessions.
  - Playwright matches accessible names as **substrings** by default (Testing Library matches whole names): use `exact: true` for short names like `Start` ("Start bell: 3 strikes" also contains it).
  - Sounds are recorded, not heard: an init script wraps `HTMLMediaElement.prototype.play` and pushes file paths to `window.__sounds`.
- **CI**: `ci.yml` (npm ci, lint, test, build) and `e2e.yml` (Playwright, report uploaded on failure), both on Node 24, on every PR and push to `main`.
- **Bug fixes are test-first**: write a test, confirm it fails on the old code, then fix. When a new test passes immediately, check it against the old code before trusting it.
- Still manual: real audio in different browsers, iPhone (locked screen, volume), layout on real devices, long real-time sessions.

## Workflow

- One branch and one focused PR per change; the owner reviews and merges. Don't merge PRs yourself.
- Commit messages explain the why; PR descriptions include what was verified (test counts, what fails on the old code, manual test steps).
- After a merge: confirm every pushed commit is on `main` (`git merge-base --is-ancestor <sha> origin/main`) **before** deleting branches - GitHub has lagged registering pushes, and a PR was once merged without its last commit.
- Keep this file and `README.md` in sync with behavior changes.

## Common Issues

- **No sound**: sounds load on page open (Start disabled until ready); browsers need a user interaction before audio - pressing Start counts. Check the console and `public/audio/`.
- **Tailwind styles missing**: `npm run dev -- --force`; check `@tailwindcss/postcss` in `postcss.config.js`.
- **npm `EBADENGINE` warnings on Node 25**: Vitest 5 and jsdom 30 officially support Node 22, 24 and 26+; things work, but Node 24 LTS avoids the warnings.

## Dependencies

- **Runtime:** `react`, `react-dom`, `lucide-react`
- **Build:** `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `autoprefixer`
- **Lint:** `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`
- **Test:** `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@playwright/test`
