import { useEffect, useRef } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { TimerProvider, useTimerContext } from './context/TimerContext';
import { useTimer } from './hooks/useTimer';
import { useAudio } from './hooks/useAudio';
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
    resumeAmbient,
    stopAmbient,
    setBellVolume,
    setAmbientVolume,
    isInitialized,
  } = useAudio();

  // Track if this is the first start (vs resume from pause)
  const isFirstStartRef = useRef(true);

  // Callbacks for timer events
  const handleTimerStart = () => {
    playBell('start');
    // Only start ambient on first start, not on resume
    if (isFirstStartRef.current && state.selectedAmbient) {
      playAmbient(state.selectedAmbient);
    }
    isFirstStartRef.current = false;
  };

  const handleTimerComplete = () => {
    playBell('end');
    stopAmbient();
    isFirstStartRef.current = true; // Reset for next session
  };

  const handleIntervalBell = () => {
    playBell('interval');
  };

  // Handle pause - pause ambient sound
  const handlePause = () => {
    timer.pause();
    pauseAmbient();
  };

  // Handle start/resume
  const handleStart = () => {
    timer.start();
    // If resuming (not first start), resume ambient
    if (!isFirstStartRef.current && state.selectedAmbient) {
      resumeAmbient();
    }
  };

  // Handle reset - stop ambient sound
  const handleReset = () => {
    timer.reset();
    stopAmbient();
    isFirstStartRef.current = true; // Reset for next session
  };

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

  // Update timer duration when context changes
  useEffect(() => {
    if (!timer.isRunning) {
      timer.updateDuration(state.duration);
    }
  }, [state.duration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
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
    <div className="min-h-screen bg-gradient-to-br from-[#FDE68A] to-[#F97316] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo */}
        <h1
          className="text-4xl md:text-5xl font-bold text-white text-center"
          style={{
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.4), 0 0 30px rgba(255, 255, 255, 0.2)',
            WebkitTextStroke: '1px rgba(0, 0, 0, 0.1)'
          }}
        >
          Wisdom Timer
        </h1>

        {/* Main Timer Card */}
        <GlassCard strong className="p-8 md:p-12">
          <div className="space-y-8">
            {/* Timer Display */}
            <TimerDisplay
              timeRemaining={timer.timeRemaining}
              progress={timer.progress}
              isRunning={timer.isRunning}
              isComplete={timer.isComplete}
            />

            {/* Timer Controls */}
            <TimerControls
              isRunning={timer.isRunning}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              disabled={!isInitialized}
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
                onSelect={actions.setDuration}
                disabled={timer.isRunning}
              />
            </div>

            {/* Custom Duration */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-3">
                Custom Duration
              </label>
              <DurationSelector
                duration={state.duration}
                onChange={actions.setDuration}
                disabled={timer.isRunning}
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
              onSoundSelect={actions.setAmbientSound}
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
                Click play to enable audio
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
