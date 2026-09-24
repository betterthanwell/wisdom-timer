# 🧘 Wisdom Timer

A calm, focused meditation timer with singing-bowl bells, interval bells, ambient sounds, and a warm glass-morphism design.

**🌐 Live: [https://wisdomtimer.app/](https://wisdomtimer.app/)**

![React](https://img.shields.io/badge/React-19.3-blue) ![Vite](https://img.shields.io/badge/Vite-8.3-purple) ![Tailwind](https://img.shields.io/badge/Tailwind-4.3-cyan) ![Tests](https://img.shields.io/badge/tests-Vitest%20%2B%20Playwright-green)

## ✨ Features

### Timer
- **Any duration** from 0:01 to 99:59 with minute/second inputs; **presets** for 30, 45, 60 and 90 minutes (default 45)
- **Settling in** (optional) - a silent 10 s to 1 min countdown before the start bell of a new session, so you can put the phone down and get comfortable; Cancel, Space or Reset stop it
- **Pause and resume** - the start bell rings again when you resume
- **Play after a finished session starts the next one** - no need to press Reset
- **"Ends at 07:45"** under the timer while a session runs (in your device's time format)
- **Quiet screen while sitting** - while the timer runs, the settings and hints are hidden and the page dims slightly; "Show settings" brings them back
- **Session counter** - "Session 1", "Session 2", … for sessions completed today (kept in memory: it starts over on reload and on a new day)
- **Keeps the screen awake** while a session runs (on by default, can be turned off), so your phone doesn't lock mid-session - in browsers that support it
- **Stays on time in background tabs** - the end and interval bells are scheduled directly, so they ring on time even when the browser slows down timers for a hidden tab

### Sound
- **Start bell** - singing bowl (~43 s)
- **Interval bells** - a short woodblock knock every 1-30 minutes (optional); never at the very end, which belongs to the end bell
- **End bell** - resonant "gling" (~35 s)
- **Ambient sounds** - rain, ocean waves or forest, looping, with a 0.5 s fade in and out
- **Bell patterns** - each bell (start, interval, end) can ring 1, 2 or 3 times, e.g. three strikes to begin and end; bowls 5 s apart, woodblock knocks 2 s apart
- **Gentle ending** (optional) - the ambient sound fades out over the last minute, so the end bell arrives into silence
- **Separate volume sliders** for bells and ambient sound; changes apply immediately, including to a bell that is still ringing

### While a session is in progress
| | Running | Paused |
|---|---|---|
| Duration (presets and custom) | Locked | Locked - Reset unlocks it |
| Ambient sound choice | Switches right away (via "Show settings") | *None* stops it; another sound starts on resume |
| Volume sliders | Usable (via "Show settings") | Usable |
| Interval bell settings | Locked | Usable |

### Completion
- **Enlightenment burst** - a 9-second light animation in three waves, and the title briefly reads "Wisdom Time!"

### Everything else
- **Keyboard shortcuts** - Space to start/pause, R to reset (browser shortcuts like Cmd/Ctrl+R are left alone, and typing in a field never triggers them)
- **Settings are remembered** in the browser (localStorage) and checked when loaded, so old or damaged saved values fall back to the defaults
- **Accessible** - labelled controls for screen readers, and animations are switched off when your system asks for reduced motion
- **Responsive** - works on phones, tablets and desktops
- **Security headers** - Content Security Policy, clickjacking protection and more (`vercel.json`, plus meta tags in `index.html`)

## ⚠️ Known limitations

- **iPhone with the screen locked:** iOS pauses web pages when the phone locks, so bells can't ring until you unlock it. "Keep screen awake" (on by default) prevents the automatic lock; locking the phone yourself still pauses the page.
- **iPhone volume sliders:** iOS Safari has historically ignored volume set by web pages, so the sliders may have no effect there (the ambient sound still stops properly). Fixing both needs the Web Audio API and is planned.

## 🚀 Getting Started

### Prerequisites
- **Node.js 22.12 or newer** (24 LTS recommended) - required by Vite 8 and Vitest
- npm

### Run it locally
```bash
npm install
npm run dev          # http://localhost:5173
```

### All scripts
| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Unit and component tests (Vitest), about 7 s |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | End-to-end tests (Playwright) in Chromium, WebKit and an iPhone profile; builds first. One-time setup: `npx playwright install chromium webkit` |

## 🧪 Testing

- **Unit and component tests (Vitest + Testing Library + jsdom)** - next to the code they test (`*.test.js(x)` in `src/`). They cover the timer (including background-tab throttling), interval-bell scheduling, the audio manager (with a fake audio element, including an iOS-style one), the session counter, settings validation, and the whole app with fake audio.
- **End-to-end tests (Playwright)** - in `e2e/`. They run the production build in real browser engines with a frozen fake clock, so a 45-minute session takes about a second, and record which sounds play.
- **CI** - GitHub Actions runs lint, unit tests and build (`ci.yml`) and the end-to-end tests (`e2e.yml`) on every pull request and on `main`.

Bugs are fixed test-first: a test that fails on the old code, then the fix.

## 🛠️ Tech Stack

- **React 19** with Context + `useReducer` for settings
- **Vite 8** for the dev server and builds
- **Tailwind CSS 4**
- **Lucide** icons
- **Vitest**, **Testing Library** and **Playwright** for tests
- **ESLint 10**
- Deployed on **Vercel**

## 📁 Project Structure

```
src/
├── App.jsx                     # Main app: session flow, keyboard shortcuts, layout
├── main.jsx                    # Entry point
├── index.css                   # Global styles, glass-morphism, animations
├── components/
│   ├── Timer/                  # TimerDisplay, TimerControls, CircularProgress
│   ├── Settings/               # PresetButtons, DurationSelector, IntervalSettings,
│   │                           # AmbientSoundSelector, VolumeControls
│   └── UI/                     # GlassCard, Button
├── hooks/
│   ├── useTimer.js             # Countdown from the clock, pause/resume, bells, background wake-ups
│   ├── useAudio.js             # React wrapper around the audio manager
│   ├── useSessionCounter.js    # Sessions completed today
│   ├── useWakeLock.js          # Keeps the screen on during a session
│   └── useLocalStorage.js      # Persisted state
├── context/
│   ├── TimerContext.jsx        # Settings state (reducer) + saving
│   └── useTimerContext.js      # Context object and hook
├── utils/
│   ├── audioManager.js         # Bells, ambient sound, fades, volume
│   ├── intervalBells.js        # When interval bells are due
│   ├── settings.js             # Validation of saved settings
│   └── timeFormatter.js        # MM:SS formatting
└── constants/
    └── audioSources.js         # Sound file paths and ambient sound list
e2e/                            # Playwright end-to-end tests
public/audio/                   # Bell and ambient sound files
```

## 🔊 Audio Files

```
public/audio/
├── bells/
│   ├── bell-start.mp3       # Start: singing bowl (~43 s)
│   ├── bell-interval.mp3    # Interval: woodblock (~0.3 s)
│   └── bell-end.mp3         # End: gling (~35 s)
└── ambient/
    ├── rain.mp3             # ~36 min loop
    ├── ocean.mp3            # ~27 min loop
    └── forest.mp3           # ~10 min loop
```

The three bell files are AAC audio in an MP4 container despite their `.mp3` names; browsers identify them by content, so they play normally.

## 🎨 Customization

### Preset durations
Edit `initialState` in `src/context/TimerContext.jsx`:
```javascript
duration: 2700,                             // default: 45 minutes (in seconds)
presetDurations: [1800, 2700, 3600, 5400],  // 30, 45, 60, 90 minutes
```

### Background colors
The gradients are Tailwind classes in `src/App.jsx`: `from-[#FDE68A] to-[#F97316]` normally, and a brighter gradient after a session completes. (The `--color-gradient-*` variables in `src/index.css` aren't currently used.)

### Adding an ambient sound
1. Put the file in `public/audio/ambient/`.
2. In `src/constants/audioSources.js`, add it to **both** `AUDIO_SOURCES.ambient` (what plays, and what saved settings are checked against) and `AMBIENT_SOUNDS` (the buttons).
3. For an icon, add it to `iconMap` in `src/components/Settings/AmbientSoundSelector.jsx`; otherwise a speaker icon is used.

## 🐛 Troubleshooting

### No sound
- Sounds load when the page opens; Start stays disabled with "Loading sounds…" until they're ready.
- Browsers only allow audio after you interact with the page - pressing Start counts.
- Check the browser console (F12) for loading errors, and that the files exist in `public/audio/`.

### Styling issues
- Make sure `@tailwindcss/postcss` is installed, and try `npm run dev -- --force` to clear Vite's cache.

## 📝 License

[MIT](LICENSE) - feel free to use this project for personal or commercial purposes.

## 🙏 Audio Attribution

All audio files used in this project are licensed under **CC0 1.0 Universal (Public Domain)**. While attribution is not legally required, we credit the following creators:

### Bell Sounds
- **Start Bell** - "Singing Bell Hit 2" by ryancacophony
  Source: [Freesound.org](https://freesound.org/people/ryancacophony/sounds/202017/)
  License: CC0 1.0 Universal (Public Domain)

- **Interval Bell (Woodblock)** - "Wood Block Hit" by thomasjaunism
  Source: [Freesound.org](https://freesound.org/people/thomasjaunism/sounds/218460/)
  License: CC0 1.0 Universal (Public Domain)

- **End Bell** - "Gling" by manuelsound
  Source: [Freesound.org](https://freesound.org/people/manuelsound/sounds/829480/)
  License: CC0 1.0 Universal (Public Domain)

### Ambient Sounds
- **Rain** - "Light Gentle Rain" by Naturthusiast
  Source: [Internet Archive](https://archive.org/details/naturesounds-soundtheraphy/Light+Gentle+Rain.mp3)
  License: CC0 1.0 Universal (Public Domain)

- **Ocean Waves** - "Birds With Ocean Waves on the Beach" by Naturthusiast
  Source: [Internet Archive](https://archive.org/details/naturesounds-soundtheraphy/Birds+With+Ocean+Waves+on+the+Beach.mp3)
  License: CC0 1.0 Universal (Public Domain)

- **Forest** - "Relaxing Nature Sounds - Birdsong Sound" by Naturthusiast
  Source: [Internet Archive](https://archive.org/details/naturesounds-soundtheraphy/Relaxing+Nature+Sounds+-+Birdsong+Sound.mp3)
  License: CC0 1.0 Universal (Public Domain)

## 🤝 Contributing

Contributions welcome - bug reports, ideas, audio recommendations and pull requests. Please run `npm run lint`, `npm test` and, for UI changes, `npm run test:e2e` before opening a PR; CI runs them too.

## 🌟 Future Enhancements

- [ ] Guided meditation audio

---

**Built with ❤️ for mindful moments**

Enjoy your meditation! 🧘‍♀️✨
