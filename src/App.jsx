import { useCallback, useEffect, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { TimerProvider } from './context/TimerContext';
import { useTimerContext } from './context/useTimerContext';
import { useTimer } from './hooks/useTimer';
import { useAudio } from './hooks/useAudio';
import { useSessionCounter } from './hooks/useSessionCounter';
import { GlassCard } from './components/UI/GlassCard';
import { Button } from './components/UI/Button';
import { TimerDisplay } from './components/Timer/TimerDisplay';
import { TimerControls } from './components/Timer/TimerControls';
import { PresetButtons } from './components/Settings/PresetButtons';
import { DurationSelector } from './components/Settings/DurationSelector';
import { IntervalSettings } from './components/Settings/IntervalSettings';
import { AmbientSoundSelector } from './components/Settings/AmbientSoundSelector';
import { VolumeControls } from './components/Settings/VolumeControls';

function MeditationTimerApp() {
  const { state, actions } = useTimerContext();
  const {
    playBell,
    playAmbient,
    pauseAmbient,
    stopAmbient,
    setBellVolume,
    setAmbientVolume,
    isInitialized,
  } = useAudio();
  const { completedToday, startNewDayIfNeeded, recordCompleted } = useSessionCounter();

  // Callbacks for timer events
  const handleTimerStart = useCallback(() => {
    startNewDayIfNeeded();
    // Rings on resume too - that's intended
    playBell('start');
    // Starts the selected sound, or resumes it if it's the one that was paused
    if (state.selectedAmbient) {
      playAmbient(state.selectedAmbient);
    }
  }, [startNewDayIfNeeded, playBell, playAmbient, state.selectedAmbient]);

  const handleTimerComplete = useCallback(() => {
    playBell('end');
    stopAmbient();
    recordCompleted();
  }, [playBell, stopAmbient, recordCompleted]);

  const handleIntervalBell = useCallback(() => {
    playBell('interval');
  }, [playBell]);

  // Initialize audio volumes
  useEffect(() => {
    if (isInitialized) {
      setBellVolume(state.bellVolume);
      setAmbientVolume(state.ambientVolume);
    }
  }, [isInitialized, state.bellVolume, state.ambientVolume, setBellVolume, setAmbientVolume]);

  const timer = useTimer(
    state.duration,
    handleTimerStart,
    handleTimerComplete,
    state.intervalBellsEnabled
      ? { interval: state.intervalDuration, callback: handleIntervalBell }
      : null
  );
  const { start: startTimer, pause: pauseTimer, reset: resetTimer, updateDuration } = timer;

  // Handle pause - pause ambient sound
  const handlePause = useCallback(() => {
    pauseTimer();
    pauseAmbient();
  }, [pauseTimer, pauseAmbient]);

  // Handle start/resume (ambient sound is handled by handleTimerStart)
  const handleStart = startTimer;

  // Handle reset - stop ambient sound
  const handleReset = useCallback(() => {
    resetTimer();
    stopAmbient();
  }, [resetTimer, stopAmbient]);

  // The session you're on today; once one completes, it stays on that number
  // until Play starts the next
  const sessionNumber = timer.isComplete ? completedToday : completedToday + 1;

  // Duration can only change between sessions, not while running or paused
  const durationLocked = timer.isRunning || timer.isPaused;

  // Update timer duration when the user picks a new one
  const handleDurationChange = (newDuration) => {
    if (durationLocked) return;
    actions.setDuration(newDuration);
    updateDuration(newDuration);
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
        if (timer.isRunning) {
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
  }, [timer.isRunning, handleStart, handlePause, handleReset]);

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-all duration-[3000ms] ease-in-out ${
        showBrightBg
          ? 'bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE047]'
          : 'bg-gradient-to-br from-[#FDE68A] to-[#F97316]'
      }`}
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo */}
        <h1
          className="text-4xl md:text-5xl font-bold text-white text-center"
          style={{
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.4), 0 0 30px rgba(255, 255, 255, 0.2)',
            WebkitTextStroke: '1px rgba(0, 0, 0, 0.1)'
          }}
        >
          {showBrightBg ? 'Wisdom Time!' : 'Wisdom Timer'}
        </h1>

        {/* Main Timer Card */}
        <GlassCard strong className="p-8 md:p-12 !mt-2">
          <div className="space-y-8">
            {/* Timer Display */}
            <TimerDisplay
              timeRemaining={timer.timeRemaining}
              progress={timer.progress}
              isRunning={timer.isRunning}
              isPaused={timer.isPaused}
              isComplete={timer.isComplete}
              sessionNumber={sessionNumber}
            />

            {/* Timer Controls */}
            <TimerControls
              isRunning={timer.isRunning}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              disabled={!isInitialized}
              startDisabled={timer.timeRemaining === 0 && !timer.isComplete}
            />
          </div>
        </GlassCard>

        {/* Settings Card */}
        <GlassCard className="p-6 !mt-6">
          <div className="space-y-6">
            {/* Settings Header */}
            <div className="flex items-center gap-2 text-white">
              <SettingsIcon className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Settings</h2>
            </div>

            {/* Preset Buttons */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Quick Select
              </label>
              <PresetButtons
                presets={state.presetDurations}
                currentDuration={state.duration}
                onSelect={handleDurationChange}
                disabled={durationLocked}
              />
            </div>

            {/* Custom Duration */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-3">
                Custom Duration
              </label>
              <DurationSelector
                duration={state.duration}
                onChange={handleDurationChange}
                disabled={durationLocked}
              />
            </div>

            {/* Interval Bells */}
            <IntervalSettings
              enabled={state.intervalBellsEnabled}
              intervalDuration={state.intervalDuration}
              onToggle={actions.setIntervalBells}
              onIntervalChange={actions.setIntervalDuration}
              disabled={timer.isRunning}
            />

            {/* Ambient Sounds */}
            <AmbientSoundSelector
              selectedSound={state.selectedAmbient}
              onSoundSelect={handleAmbientSelect}
              disabled={false}
            />

            {/* Volume Controls */}
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
              disabled={false}
            />

            {/* Audio Initialization Notice */}
            {!isInitialized && (
              <div className="text-xs text-white/60 text-center">
                Loading sounds…
              </div>
            )}
          </div>
        </GlassCard>

        {/* Footer */}
        <div className="text-center text-white/60 text-sm">
          <p>Press space to play/pause • R to reset</p>
        </div>
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
