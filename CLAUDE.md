# CLAUDE.md - AI Assistant Guide for Wisdom Timer

## Project Overview

Wisdom Timer is a modern meditation timer web application built with React 19 and Vite 7. It features ambient sounds, interval bells, a glass-morphism UI with warm gradient backgrounds, and an "enlightenment burst" animation on completion.

**Live Demo:** https://wisdomtimer.app/

## Technology Stack

- **React 19** - Latest React with hooks and Context API
- **Vite 7** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS with custom theme via `@theme` directive
- **Lucide React** - Icon library
- **ESLint 9** - Flat config with React plugins

## Quick Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Project Structure

```
wisdom-timer/
├── src/
│   ├── components/
│   │   ├── Timer/              # Timer display components
│   │   │   ├── TimerDisplay.jsx    # Main time display with status
│   │   │   ├── TimerControls.jsx   # Play/pause/reset buttons
│   │   │   └── CircularProgress.jsx # Progress ring SVG
│   │   ├── Settings/           # Settings panel components
│   │   │   ├── PresetButtons.jsx       # Quick duration presets
│   │   │   ├── DurationSelector.jsx    # Custom duration inputs
│   │   │   ├── IntervalSettings.jsx    # Interval bell config
│   │   │   ├── AmbientSoundSelector.jsx # Ambient sound picker
│   │   │   └── VolumeControls.jsx      # Bell/ambient volume sliders
│   │   └── UI/                 # Reusable UI primitives
│   │       ├── GlassCard.jsx       # Glass-morphism card wrapper
│   │       └── Button.jsx          # Styled button component
│   ├── hooks/
│   │   ├── useTimer.js         # Timer logic with drift prevention
│   │   ├── useAudio.js         # Audio playback React hook
│   │   └── useLocalStorage.js  # LocalStorage persistence hook
│   ├── context/
│   │   └── TimerContext.jsx    # Global state with useReducer
│   ├── utils/
│   │   ├── audioManager.js     # Singleton audio controller class
│   │   └── timeFormatter.js    # Time formatting utilities
│   ├── constants/
│   │   └── audioSources.js     # Audio file paths and metadata
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # (Currently empty, styles in index.css)
│   ├── main.jsx               # Entry point, renders App
│   └── index.css              # Global styles + Tailwind config
├── public/
│   ├── audio/
│   │   ├── bells/              # Bell sound effects (start, interval, end)
│   │   └── ambient/            # Ambient loops (rain, ocean, forest)
│   └── favicon.svg
├── index.html                  # HTML template with security headers
├── vite.config.js             # Vite configuration
├── eslint.config.js           # ESLint flat config
├── postcss.config.js          # PostCSS with Tailwind plugin
└── package.json
```

## Architecture Patterns

### State Management
- **TimerContext** (`src/context/TimerContext.jsx`) - Central state using `useReducer` pattern
- Actions: `setDuration`, `setIntervalBells`, `setIntervalDuration`, `setAmbientSound`, `setBellVolume`, `setAmbientVolume`
- State persists to localStorage via `useLocalStorage` hook

### Audio System
- **AudioManager** (`src/utils/audioManager.js`) - Singleton class managing all audio
- Bells are cloned for overlapping playback
- Ambient sounds have fade in/out effects (500ms)
- Browser autoplay policy handled via user interaction initialization

### Timer Logic
- **useTimer** hook uses `Date.now()` calculations to prevent drift
- Updates every 100ms for smooth display
- Supports interval callbacks for bell scheduling

## Code Conventions

### File Naming
- Components: PascalCase (e.g., `TimerDisplay.jsx`)
- Hooks: camelCase with `use` prefix (e.g., `useTimer.js`)
- Utils/constants: camelCase (e.g., `audioManager.js`)

### Component Structure
- Functional components with hooks only
- Props destructured in function signature
- Export named components (not default) for most files
- Main `App` component uses default export

### Styling
- Tailwind CSS utility classes preferred
- Custom CSS in `index.css` for:
  - Glass-morphism effects (`.glass-card`, `.glass-card-strong`)
  - Custom keyframe animations
  - Theme variables via `@theme` directive
- Inline styles for complex/dynamic values (shadows, gradients)

### State Updates
- Dispatch actions via context for global state
- Local state with `useState` for component-specific UI state
- Refs for values that shouldn't trigger re-renders

## Key Implementation Details

### Timer Accuracy
The timer uses `expectedEndTimeRef` calculated from `Date.now()` rather than decrementing to prevent drift from CPU throttling or background tabs.

### Audio Loading Priority
Bells preload before ambient sounds (critical for instant playback). The `AudioManager.init()` awaits bell loading before creating ambient elements.

### Security Headers
`index.html` includes CSP, X-Frame-Options, and other security headers to prevent XSS and clickjacking.

### Accessibility
- `prefers-reduced-motion` media query disables animations
- Keyboard shortcuts: Space (play/pause), R (reset)
- Input fields ignore keyboard shortcuts when focused

## Adding Features

### New Ambient Sound
1. Add audio file to `public/audio/ambient/`
2. Update `src/constants/audioSources.js`:
   - Add to `AUDIO_SOURCES.ambient` object
   - Add to `AMBIENT_SOUNDS` array with icon name from Lucide

### New Bell Sound
1. Add audio file to `public/audio/bells/`
2. Update `AUDIO_SOURCES.bells` in `src/constants/audioSources.js`
3. Update `AudioManager` bells object if new bell type

### Modifying Theme Colors
Edit `src/index.css` `@theme` block:
```css
@theme {
  --color-gradient-start: #FDE68A;
  --color-gradient-end: #F97316;
}
```

### Adding New Settings
1. Add to `initialState` in `TimerContext.jsx`
2. Add action type and reducer case
3. Add action function
4. Include in localStorage save/load
5. Create settings component

## Testing

No automated tests currently configured. Manual testing recommended:
- Timer accuracy over long durations
- Audio playback in different browsers
- Responsive layout on mobile/tablet
- Keyboard shortcuts
- Settings persistence after reload

## Common Issues

### Audio Not Playing
- Browser autoplay requires user interaction first
- Check browser console for loading errors
- Verify audio files exist in `public/audio/`

### Tailwind Styles Missing
- Run `npm run dev -- --force` to clear cache
- Ensure `@tailwindcss/postcss` is in `postcss.config.js`

### Timer Drift
- Should not occur with current implementation
- If seen, verify `Date.now()` calculations in `useTimer.js`

## Dependencies

### Production
- `react` / `react-dom` - UI framework
- `lucide-react` - Icons

### Development
- `vite` + `@vitejs/plugin-react` - Build tooling
- `tailwindcss` + `@tailwindcss/postcss` + `autoprefixer` - Styling
- `eslint` + plugins - Linting
