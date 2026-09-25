import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Settings as SettingsIcon } from 'lucide-react';
import { TimerProvider } from './context/TimerContext';
import { useTimerContext } from './context/useTimerContext';
import { useTimer } from './hooks/useTimer';
import { useAudio } from './hooks/useAudio';
import { useSessionCounter } from './hooks/useSessionCounter';
import { useWakeLock, isWakeLockSupported } from './hooks/useWakeLock';
import { useSettleCountdown } from './hooks/useSettleCountdown';
import { gentleEndingLevel } from './utils/gentleEnding';
import { GlassCard } from './components/UI/GlassCard';
import { SettingLabel } from './components/UI/SettingLabel';
import { TimerDisplay } from './components/Timer/TimerDisplay';
import { TimerControls } from './components/Timer/TimerControls';
import { PresetButtons } from './components/Settings/PresetButtons';
import { DurationSelector } from './components/Settings/DurationSelector';
import { IntervalSettings } from './components/Settings/IntervalSettings';
import { AmbientSoundSelector } from './components/Settings/AmbientSoundSelector';
import { VolumeControls } from './components/Settings/VolumeControls';
import { KeepAwakeSetting } from './components/Settings/KeepAwakeSetting';
import { SettleSetting } from './components/Settings/SettleSetting';
import { BellPatternSettings } from './components/Settings/BellPatternSettings';
import { GentleEndingSetting } from './components/Settings/GentleEndingSetting';
import { OpenEndedSetting } from './components/Settings/OpenEndedSetting';
import { MettaSetting } from './components/Settings/MettaSetting';
import { MettaCard } from './components/Timer/MettaCard';

// Open-ended sitting counts up, as a countdown from 24 hours
const OPEN_ENDED_SECONDS = 24 * 60 * 60;

// A group of settings in the settings card (groups are divided by lines)
const SECTION = 'space-y-4 py-5 first:pt-0 last:pb-0';
// A keyboard key in the shortcut hint
const KEY = 'px-1.5 py-0.5 rounded-md border border-white/30 bg-white/15 font-sans text-[11px] text-white';

function MeditationTimerApp() {
  const { state, actions } = useTimerContext();
  const {
    playBell,
    cancelPendingBells,
    playAmbient,
    pauseAmbient,
    stopAmbient,
    setBellVolume,
    setAmbientVolume,
    setAmbientLevel,
    isInitialized,
  } = useAudio();
  const { completedToday, startNewDayIfNeeded, recordCompleted } = useSessionCounter();

  // Callbacks for timer events
  const handleTimerStart = useCallback(() => {
    startNewDayIfNeeded();
    // Rings on resume too - that's intended
    playBell('start', state.startStrikes);
    // Starts the selected sound, or resumes it if it's the one that was paused
    if (state.selectedAmbient) {
      playAmbient(state.selectedAmbient);
    }
  }, [startNewDayIfNeeded, playBell, state.startStrikes, playAmbient, state.selectedAmbient]);

  const handleTimerComplete = useCallback(() => {
    playBell('end', state.endStrikes);
    stopAmbient();
    recordCompleted();
  }, [playBell, state.endStrikes, stopAmbient, recordCompleted]);

  const handleIntervalBell = useCallback(() => {
    playBell('interval', state.intervalStrikes);
  }, [playBell, state.intervalStrikes]);

  // Initialize audio volumes
  useEffect(() => {
    if (isInitialized) {
      setBellVolume(state.bellVolume);
      setAmbientVolume(state.ambientVolume);
    }
  }, [isInitialized, state.bellVolume, state.ambientVolume, setBellVolume, setAmbientVolume]);

  const timer = useTimer(
    state.openEnded ? OPEN_ENDED_SECONDS : state.duration,
    handleTimerStart,
    handleTimerComplete,
    state.intervalBellsEnabled
      ? { interval: state.intervalDuration, firstAt: state.intervalStart, callback: handleIntervalBell }
      : null
  );
  const { start: startTimer, pause: pauseTimer, finish: finishTimer, reset: resetTimer, updateDuration } = timer;
  // Open-ended: show the time sat (counting up) instead of the time left
  const displaySeconds = state.openEnded ? timer.duration - timer.timeRemaining : timer.timeRemaining;

  // Handle pause - pause ambient sound
  const handlePause = useCallback(() => {
    pauseTimer();
    pauseAmbient();
  }, [pauseTimer, pauseAmbient]);

  // Handle start/resume (ambient sound is handled by handleTimerStart)
  // Quiet screen: while running, settings are hidden unless asked for
  const [settingsRevealed, setSettingsRevealed] = useState(false);

  // Optional settling-in countdown before a new session's start bell. When it
  // ends it calls the *latest* startTimer, so changes made meanwhile (e.g.
  // the ambient sound) are used.
  const { isSettling, settleRemaining, begin: beginSettling, cancel: cancelSettling } = useSettleCountdown();
  const startTimerRef = useRef(startTimer);
  useEffect(() => {
    startTimerRef.current = startTimer;
  }, [startTimer]);

  const handleStart = useCallback(() => {
    setSettingsRevealed(false); // every start begins quiet
    // Settle in only before a new session - resuming starts right away
    if (!timer.isPaused && state.settleSeconds > 0) {
      beginSettling(state.settleSeconds, () => startTimerRef.current());
    } else {
      startTimer();
    }
  }, [timer.isPaused, state.settleSeconds, beginSettling, startTimer]);

  // Handle reset - stop ambient sound
  const handleReset = useCallback(() => {
    cancelSettling();
    cancelPendingBells();
    resetTimer();
    stopAmbient();
  }, [cancelSettling, cancelPendingBells, resetTimer, stopAmbient]);

  // The session you're on today; once one completes, it stays on that number
  // until Play starts the next
  const sessionNumber = timer.isComplete ? completedToday : completedToday + 1;

  const inSession = timer.isRunning || isSettling;
  const quiet = inSession && !settingsRevealed;

  // Gentle ending: fade the ambient sound out over the last minute, so the
  // end bell arrives into silence. Full level whenever it doesn't apply.
  const ambientLevel =
    state.gentleEnding && timer.isRunning ? gentleEndingLevel(timer.timeRemaining, timer.duration) : 1;
  useEffect(() => {
    setAmbientLevel(ambientLevel);
  }, [ambientLevel, setAmbientLevel]);

  // Keep the screen on while a session is running, so the phone doesn't lock
  useWakeLock(state.keepScreenAwake && inSession);

  // Duration can only change between sessions, not while running or paused
  const durationLocked = timer.isRunning || timer.isPaused || isSettling;

  // Update timer duration when the user picks a new one
  const handleDurationChange = (newDuration) => {
    if (durationLocked) return;
    actions.setDuration(newDuration);
    updateDuration(newDuration);
  };

  // Switching between a set duration and open-ended sitting (between sessions)
  const handleOpenEndedChange = (enabled) => {
    if (durationLocked) return;
    actions.setOpenEnded(enabled);
    updateDuration(enabled ? OPEN_ENDED_SECONDS : state.duration);
  };

  // Ambient sound can change at any time. While running it switches right
  // away; while paused the new sound starts on resume. None always stops it.
  const handleAmbientSelect = (soundId) => {
    actions.setAmbientSound(soundId);
    if (soundId === null) {
      stopAmbient();
    } else if (timer.isRunning) {
      playAmbient(soundId);
    }
  };

  // Bright background after completion, fading back once the 9-second burst ends
  const [brightBgFaded, setBrightBgFaded] = useState(false);
  const showBrightBg = timer.isComplete && !brightBgFaded;

  useEffect(() => {
    if (!timer.isComplete) return;

    const fadeBackTimeout = setTimeout(() => {
      setBrightBgFaded(true);
    }, 9000); // Match enlightenment burst duration

    return () => {
      clearTimeout(fadeBackTimeout);
      setBrightBgFaded(false); // Reset for next completion
    };
  }, [timer.isComplete]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Leave browser shortcuts like Cmd/Ctrl+R (reload) alone
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isSettling) {
          cancelSettling();
        } else if (timer.isRunning) {
          handlePause();
        } else {
          handleStart();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [timer.isRunning, isSettling, cancelSettling, handleStart, handlePause, handleReset]);

  return (
    <div
      className={`min-h-dvh flex justify-center px-4 py-6 sm:py-12 transition-colors duration-[3000ms] ease-in-out ${
        showBrightBg
          ? 'bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE047]'
          : 'bg-gradient-to-br from-[#FDE68A] to-[#F97316]'
      }`}
    >
      {/* Dims the page while sitting (clicks pass through) */}
      <div
        data-testid="quiet-dim"
        aria-hidden="true"
        className={`fixed inset-0 z-10 bg-black/25 pointer-events-none transition-opacity duration-[2000ms] ${
          quiet ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="w-full max-w-md sm:max-w-xl space-y-4">
        <h1
          className="text-3xl sm:text-5xl font-bold tracking-tight text-white text-center"
          style={{ textShadow: '0 1px 3px rgba(120, 53, 15, 0.3), 0 0 24px rgba(255, 255, 255, 0.35)' }}
        >
          {showBrightBg ? 'Wisdom Time!' : 'Wisdom Timer'}
        </h1>

        {/* Metta phrases in their own card, while a session is under way */}
        {state.mettaMode && (timer.isRunning || timer.isPaused) && (
          <MettaCard
            elapsed={timer.duration - timer.timeRemaining}
            seconds={state.mettaSeconds}
            isRunning={timer.isRunning}
          />
        )}

        {/* Main Timer Card */}
        <GlassCard strong className="px-5 py-6 sm:p-10 space-y-3">
          <TimerDisplay
            timeRemaining={displaySeconds}
            progress={state.openEnded ? 0 : timer.progress}
            isRunning={timer.isRunning}
            isPaused={timer.isPaused}
            isComplete={timer.isComplete}
            sessionNumber={sessionNumber}
            endsAt={state.openEnded ? null : timer.endsAt}
            settleRemaining={isSettling ? settleRemaining : null}
          />
          <TimerControls
            isRunning={timer.isRunning}
            isSettling={isSettling}
            onStart={handleStart}
            onPause={handlePause}
            onCancel={cancelSettling}
            onFinish={finishTimer}
            showFinish={state.openEnded && (timer.isRunning || timer.isPaused)}
            onReset={handleReset}
            disabled={!isInitialized}
            startDisabled={timer.timeRemaining === 0 && !timer.isComplete}
          />
        </GlassCard>

        {/* While running, settings stay out of the way until asked for */}
        {inSession && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setSettingsRevealed((revealed) => !revealed)}
              aria-expanded={settingsRevealed}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <SettingsIcon className="w-4 h-4" aria-hidden="true" />
              {settingsRevealed ? 'Hide settings' : 'Show settings'}
            </button>
          </div>
        )}

        {/* Settings Card, in groups: duration, bells, metta, sound, screen */}
        {!quiet && (
          <GlassCard className="px-5 py-5 sm:p-6">
            <div className="flex items-center gap-2 text-white">
              <SettingsIcon className="w-5 h-5" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Settings</h2>
            </div>

            <div className="mt-4 divide-y divide-white/15">
              <section className={SECTION}>
                <OpenEndedSetting
                  enabled={state.openEnded}
                  onToggle={handleOpenEndedChange}
                  disabled={durationLocked}
                />
                <div className="space-y-3">
                  <SettingLabel icon={Clock}>Duration</SettingLabel>
                  <PresetButtons
                    presets={state.presetDurations}
                    currentDuration={state.duration}
                    onSelect={handleDurationChange}
                    disabled={durationLocked || state.openEnded}
                  />
                  <DurationSelector
                    duration={state.duration}
                    onChange={handleDurationChange}
                    disabled={durationLocked || state.openEnded}
                  />
                </div>
                <SettleSetting
                  seconds={state.settleSeconds}
                  onChange={actions.setSettleSeconds}
                  disabled={durationLocked}
                />
              </section>

              <section className={SECTION}>
                <IntervalSettings
                  enabled={state.intervalBellsEnabled}
                  intervalDuration={state.intervalDuration}
                  intervalStart={state.intervalStart}
                  onToggle={actions.setIntervalBells}
                  onIntervalChange={actions.setIntervalDuration}
                  onStartChange={actions.setIntervalStart}
                  disabled={timer.isRunning}
                />
                {/* How many times each bell rings (choices behind a switch;
                    saved choices apply either way) */}
                <BellPatternSettings
                  strikes={{ start: state.startStrikes, interval: state.intervalStrikes, end: state.endStrikes }}
                  onChange={actions.setBellStrikes}
                  shown={state.showBellStrikes}
                  onShownChange={actions.setShowBellStrikes}
                />
              </section>

              <section className={SECTION}>
                <MettaSetting
                  enabled={state.mettaMode}
                  seconds={state.mettaSeconds}
                  onToggle={actions.setMettaMode}
                  onSecondsChange={actions.setMettaSeconds}
                />
              </section>

              <section className={SECTION}>
                <AmbientSoundSelector
                  selectedSound={state.selectedAmbient}
                  onSoundSelect={handleAmbientSelect}
                />
                <GentleEndingSetting
                  enabled={state.gentleEnding}
                  onToggle={actions.setGentleEnding}
                />
                <VolumeControls
                  bellVolume={state.bellVolume}
                  ambientVolume={state.ambientVolume}
                  onBellVolumeChange={(vol) => {
                    actions.setBellVolume(vol);
                    setBellVolume(vol);
                  }}
                  onAmbientVolumeChange={(vol) => {
                    actions.setAmbientVolume(vol);
                    setAmbientVolume(vol);
                  }}
                />
              </section>

              {/* Keep screen awake (only where the browser supports it) */}
              {isWakeLockSupported() && (
                <section className={SECTION}>
                  <KeepAwakeSetting
                    enabled={state.keepScreenAwake}
                    onToggle={actions.setKeepScreenAwake}
                  />
                </section>
              )}
            </div>

            {!isInitialized && (
              <p className="mt-4 text-xs text-white/70 text-center">Loading sounds…</p>
            )}
          </GlassCard>
        )}

        {/* Keyboard shortcuts - only where there's likely a keyboard (a
            mouse or trackpad as the main pointer), not on touch screens */}
        {!quiet && (
          <p
            data-testid="keyboard-hint"
            className="hidden pointer-fine:flex items-center justify-center gap-1.5 text-xs text-white/75"
          >
            <kbd className={KEY}>Space</kbd> start / pause
            <span aria-hidden="true" className="mx-1">·</span>
            <kbd className={KEY}>R</kbd> reset
          </p>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <TimerProvider>
      <MeditationTimerApp />
    </TimerProvider>
  );
}

export default App;
