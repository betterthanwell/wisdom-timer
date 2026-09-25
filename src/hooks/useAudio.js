import { useState, useEffect, useCallback } from 'react';
import { audioManager } from '../utils/audioManager';

// Straight calls on the audioManager singleton: defined once, so they're
// stable across renders without useCallback
const passThrough = {
  // Call during a tap or key press: lets sounds started later (by timers) play
  unlock: () => audioManager.unlock(),
  // Stop strikes of a bell pattern that haven't rung yet
  cancelPendingBells: () => audioManager.cancelPendingBells(),
  // Call during a tap when the ambient sound will start later (settling in)
  primeAmbient: (soundId) => audioManager.primeAmbient(soundId),
  pauseAmbient: () => audioManager.pauseAmbient(),
  stopAmbient: () => audioManager.stopAmbient(),
  // Volumes are 0.0 to 1.0
  setBellVolume: (volume) => audioManager.setBellVolume(volume),
  setAmbientVolume: (volume) => audioManager.setAmbientVolume(volume),
  // Scale the ambient volume by a 0-1 level (gentle ending)
  setAmbientLevel: (level) => audioManager.setAmbientLevel(level),
  // Told when something outside the app (iOS: a call) stops a guided voice
  // or takes the audio away: (position in the recording, or null) => void
  setInterruptionListener: (listener) => audioManager.setInterruptionListener(listener),
  // Where a guided voice was cut short (seconds), or null
  cutShortVoicePosition: () => audioManager.cutShortVoicePosition(),
};

export const useAudio = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  // Load the sounds on mount
  useEffect(() => {
    audioManager.init().then(setIsInitialized);
    return () => audioManager.cleanup();
  }, []);

  const playBell = useCallback(async (type, strikes = 1) => {
    if (!isInitialized) {
      console.warn('Audio not initialized yet');
      return;
    }
    await audioManager.playBell(type, strikes);
  }, [isInitialized]);

  // An ambient sound, or a guided recording `from` seconds in
  const playAmbient = useCallback(async (soundId, ...from) => {
    if (!isInitialized) {
      console.warn('Audio not initialized yet');
      return;
    }
    await audioManager.playAmbient(soundId, ...from);
  }, [isInitialized]);

  return { isInitialized, playBell, playAmbient, ...passThrough };
};
