# CLAUDE.md - Wisdom Timer

Wisdom Timer is a meditation timer web app (React 19, Vite 8, Tailwind 4): bells at start, at intervals and at the end, looping ambient sounds, the time as a breathing glow (nimitta) above glass-morphism cards on a warm gradient, and an "enlightenment burst" animation on completion. Deployed on Vercel. **Live:** https://wisdomtimer.app/

## Rules

These are firm. Everything else in this file and in `docs/` describes how things are done now; deviate when there's a reason, and say so.

- **Don't merge PRs.** One branch and one focused PR per change; the owner reviews and merges.
- **Don't change the owner's session behavior without asking** - see `docs/behavior.md`.
- **Bug fixes are test-first**: write a test, confirm it fails on the old code, then fix. When a new test passes immediately, check it against the old code before trusting it.
- **Lint stays at zero errors and zero warnings.**
- **After a merge, confirm every pushed commit is on `main`** (`git merge-base --is-ancestor <sha> origin/main`) before deleting branches - GitHub has lagged registering pushes, and a PR was once merged without its last commit.

## Docs

- `docs/behavior.md` - how a session behaves (layout, bells, locking, quiet screen, settling in, metta, open-ended …). Read the relevant part before changing session behavior.
- `docs/architecture.md` - state, `useTimer`, `audioManager` and its iOS constraints, the service worker, platform limits, security headers, accessibility. Read the relevant part before touching audio, offline or headers.
- Product direction (see README, "Free, for good"): functional meditation features only - no streaks, stats, accounts, ads, analytics or payments, and no social sharing or similar engagement features. Free for anyone, for ever.

## Quick Commands

```bash
npm install          # Install dependencies (Node 22.12+; 24 LTS recommended)
npm run dev          # Dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Serve the production build
npm run lint         # ESLint
npm test             # Vitest, once (~10 s)
npm run test:watch   # Vitest, watch mode
npm run test:e2e     # Playwright: builds, then Chromium / Firefox / WebKit / iPhone profile
```

## Project Structure

```
├── src/
│   ├── App.jsx                  # Session flow, keyboard shortcuts, layout (default export)
│   ├── App.*.test.jsx           # Component tests: whole app, audioManager mocked (session, settle, modes, screen)
│   ├── test/                    # appTestUtils.jsx (renderApp, click, …), audioManagerMock.js
│   ├── main.jsx                 # Entry point (StrictMode); registers the service worker once bells load
│   ├── sw.js                    # Service worker source (offline use) - emitted as /sw.js by vite.config.js
│   ├── registerServiceWorker.js # Registers /sw.js (production builds only)
│   ├── index.css                # Global styles, .glass-card(-strong), keyframes, reduced motion
│   ├── components/
│   │   ├── Timer/               # TimerDisplay (time, status, "Session N", burst), CircularProgress (glow + progress trail),
│   │   │                        # TimerControls (Start/Pause|Cancel/Finish/Reset), MettaCard
│   │   ├── Settings/            # PresetButtons, DurationSelector, IntervalSettings,
│   │   │                        # AmbientSoundSelector (+ iconMap), VolumeControls, KeepAwakeSetting, SettleSetting, BellPatternSettings, GentleEndingSetting, OpenEndedSetting, MettaSetting, DimSetting
│   │   │                        # (KeepAwakeSetting and BellPatternSettings aren't shown for now)
│   │   └── UI/                  # GlassCard, Button (`round` for circles), Switch (on/off toggle with accessible name),
│   │                            # SettingLabel (icon + setting name), ChoiceButton (option with aria-pressed),
│   │                            # DebugPanel (?debug card)
│   ├── hooks/
│   │   ├── useTimer.js          # Countdown from the clock, pause/resume, interval bells, wake-ups
│   │   ├── useAudio.js          # React wrapper around the audioManager singleton
│   │   ├── useSessionCounter.js # Sessions completed today (memory only, resets daily)
│   │   ├── useWakeLock.js       # Keeps the screen on (Screen Wake Lock API) while active
│   │   ├── useSettleCountdown.js # Settling-in countdown before a new session
│   │   ├── useAmbientDownloads.js # Each ambient sound's download status (useSyncExternalStore)
│   │   └── useLocalStorage.js   # Persisted state
│   ├── context/
│   │   ├── TimerContext.jsx     # TimerProvider: settings reducer + saving to localStorage
│   │   └── useTimerContext.js   # Context object + useTimerContext hook (own file for fast refresh)
│   ├── utils/
│   │   ├── audioManager.js      # AudioManager class + singleton: bells, ambient, fades, volume
│   │   ├── ambientDownloads.js  # Downloads ambient sounds when chosen, keeps them in Cache Storage
│   │   ├── intervalBells.js     # countIntervalBellsDue() - pure bell scheduling
│   │   ├── gentleEnding.js      # gentleEndingLevel() - ambient level over the last minute
│   │   ├── metta.js             # METTA_PHRASES + mettaStep() - which phrase shows when
│   │   ├── settings.js          # sanitizeSettings() - validates saved settings
│   │   ├── debugLog.js          # debugLog.add() - audio events for the ?debug panel
│   │   ├── testingTools.js      # ?speed / ?debug, off on wisdomtimer.app
│   │   └── timeFormatter.js     # formatTime (MM:SS) etc.
│   └── constants/
│       └── audioSources.js      # AUDIO_SOURCES (paths) + AMBIENT_SOUNDS (buttons)
├── e2e/                         # Playwright: session.spec.js, offline.spec.js, darkreader.spec.js, sounds.js (sound recorder)
├── public/audio/bells|ambient/  # Sound files (see docs/architecture.md, Audio)
├── public/manifest.webmanifest  # Web app manifest (install to home screen) + public/icons/
├── .github/workflows/           # ci.yml (lint, test, build), e2e.yml (Playwright)
├── index.html                   # HTML shell + CSP meta tags + darkreader-lock
├── vercel.json                  # HTTP security headers (the effective ones)
├── vite.config.js               # Vite + Vitest config; serviceWorker() plugin builds /sw.js
├── playwright.config.js         # Playwright config (vite preview on :4173)
├── eslint.config.js             # Flat config; Node globals for Playwright files
├── postcss.config.js            # @tailwindcss/postcss
└── LICENSE                      # MIT
```

## Code Conventions

- Components PascalCase `.jsx`; hooks `useX.js`; utils/constants camelCase.
- Functional components, props destructured in the signature, named exports (except `App`).
- Tailwind utility classes; custom CSS only in `index.css` (glass cards, keyframes). Inline styles for complex values (shadows, radial gradients).
- **Base CSS goes in `@layer base`.** Tailwind 4 puts utilities in cascade layers, and unlayered CSS beats any layer: a bare `* { padding: 0 }` once silently wiped out every `p-*`/`m-*`/`space-y-*` in the app. Tailwind's preflight already resets margins and box-sizing.
- Give a button one rounding class (`Button`'s `round` prop): conflicting ones like `rounded-xl rounded-full` resolve by stylesheet order, not class order.
- Settings rows: `SettingLabel` for the heading, `Switch` for on/off, `ChoiceButton` for options. The settings card is grouped into `<section>`s divided by lines: duration, bells, metta, ambient sound (+ gentle ending), screen (dimming), then volume last ("Sound volume" heading over the Bells/Sound sliders).
- Global settings via context actions; local UI state with `useState`; refs for values that mustn't re-render.
- Handlers passed to `useTimer` or used in effects are wrapped in `useCallback` - `useTimer`'s timer effect depends on `onComplete`, so an unstable callback would restart it every render.
- The react-hooks lint rules include `set-state-in-effect` and exhaustive deps.

## Adding Features

New ambient sounds, preset durations and background colors: see README, "Customization".

### New bell sound
1. Add the file to `public/audio/bells/`.
2. Update `AUDIO_SOURCES.bells`, and the `bells` object in `AudioManager` if it's a new bell type.

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
- `App.*.test.jsx` render `<App />` with `audioManager` replaced by spies (`vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'))` in each file) and find controls by accessible name; shared helpers and `setUpAppTests()` are in `src/test/appTestUtils.jsx`. They're split into several files so Vitest runs them in parallel (one file took ~14 s of a 17 s run); keep each under ~5 s. Sessions run on the fake clock (`completeOneSecondSession()`), not in real time.
- Pure logic tests start with `// @vitest-environment node` (no jsdom to set up).
- Vitest globals are off, so Testing Library doesn't auto-clean: call `cleanup()` in `afterEach` (`setUpAppTests()` does).
- While iterating, run just the affected test file (`npx vitest run src/App.settle.test.jsx`) and e2e spec in Chromium (`npx playwright test -g "…" --project=chromium`, ~5-12 s); the full matrix once at the end, and CI on the PR.
- **Playwright** (`e2e/`): the production build in Chromium, Firefox, WebKit and an iPhone 15 profile. First time: `npx playwright install chromium firefox webkit`.
  - The page clock is faked **and frozen** (`clock.install()` then `clock.pauseAt()`); an unfrozen fake clock keeps flowing in real time, which made a test flaky on slow CI. Advance with `clock.fastForward` in 1-minute jumps; `runFor` fires every 100ms tick and is far too slow for long sessions.
  - Playwright matches accessible names as **substrings** by default (Testing Library matches whole names): use `exact: true` for short names like `Start` ("Start bell: 3 strikes" also contains it).
  - Sounds are recorded, not heard: an init script (`e2e/sounds.js`, shared by both specs) wraps `HTMLMediaElement.prototype.play` (muted) and Web Audio (`decodeAudioData` mapped back to file paths, `AudioBufferSourceNode.start`; output routed through a muted gain) and pushes file paths to `window.__sounds`; `window.__soundLog` says how each played (`element` / `webaudio` + context state), `window.__decodedSounds` counts decoded bells, `window.__audioStates` records context state changes.
  - Bells now start a moment after the tap (they wait for audio to resume), so poll sound counts (`expect.poll(() => countSound(…))`), and wait for the start bell before `fastForward` - otherwise the fake clock jumps past the 1s resume wait.
  - Headless WebKit pages in parallel runs interrupt each other's Web Audio (context state `interrupted`) even when muted; bells then rightly fall back to `<audio>`. Tests that insist on Web Audio skip when an interruption was recorded (they pass with `--workers=1`).
  - Firefox's Web Audio needs a sound device: without one its audio context stays `suspended` and `resume()` never settles, so bells wait on the frozen clock's 1s fallback forever. `e2e.yml` starts PulseAudio with a null sink; locally, have a sound server running. A failed session test prints its audio state, sounds and console to the log (`reportSoundsOnFailure()` in `e2e/sounds.js`).
  - Don't simulate losing the network with `context.setOffline()` or `route()` in WebKit: both cut WebKit off before its service worker can answer (and its offline emulation also blocks media from memory). `offline.spec.js` serves a build itself with Vite's `preview()` and stops that server.
- **CI**: `ci.yml` (npm ci, lint, test, build) and `e2e.yml` (Playwright, report uploaded on failure), both on Node 24, on every PR and push to `main`.
- Still manual: real audio in different browsers, **iPhone (every bell - start, woodblock, end - after a real session; emulators don't enforce iOS's no-sound-without-a-tap rule)**, locked screen, volume, layout on real devices, long real-time sessions.

## Workflow

- Commit messages explain the why; PR descriptions are short and include what was verified (test counts, what fails on the old code, manual test steps).
- Keep this file, `docs/` and `README.md` in sync with behavior changes.

## Testing on a phone (previews and local only)

Never on wisdomtimer.app (`utils/testingTools.js` checks the host):
- `?speed=60` - session time runs 60× faster (1-600; `sessionClock` in `useTimer` and `useSettleCountdown`); a "speed ×N" badge shows while it's on.
- `?debug` - a card at the end of the page (`UI/DebugPanel`; above the quiet-screen dim, covering nothing) with the audio context state and the latest audio events (`debugLog.add()`: unlock, resume, how each bell played or why it fell back, ambient failures). Use both on a Vercel preview for iPhone checks, e.g. `…vercel.app/?speed=60&debug`.

## Common Issues

See also README, "Troubleshooting" (no sound, missing styles).

- **npm `EBADENGINE` warnings on Node 25**: Vitest 5 and jsdom 30 officially support Node 22, 24 and 26+; things work, but Node 24 LTS avoids the warnings.
