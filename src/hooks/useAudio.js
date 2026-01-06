import { useState, useEffect, useCallback } from 'react';
import { audioManager } from '../utils/audioManager';

export const useAudio = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAmbient, setCurrentAmbient] = useState(null);

  // Initialize audio on mount
  useEffect(() => {
    const initAudio = async () => {
      const success = await audioManager.init();
      setIsInitialized(success);
    };

    initAudio();

    return () => {
      audioManager.cleanup();
    };
  }, []);

  // Play a bell sound
  const playBell = useCallback(async (type) => {
    if (!isInitialized) {
      console.warn('Audio not initialized yet');
      return;
    }
    await audioManager.playBell(type);
  }, [isInitialized]);

  // Play ambient sound
  const playAmbient = useCallback(async (soundId) => {
    if (!isInitialized) {
      console.warn('Audio not initialized yet');
      return;
    }
    await audioManager.playAmbient(soundId);
    setCurrentAmbient(soundId);
    setIsPlaying(true);
  }, [isInitialized]);

  // Pause ambient sound
  const pauseAmbient = useCallback(() => {
    audioManager.pauseAmbient();
    setIsPlaying(false);
  }, []);

  // Resume ambient sound
  const resumeAmbient = useCallback(() => {
    audioManager.resumeAmbient();
    setIsPlaying(true);
  }, []);

  // Stop ambient sound
  const stopAmbient = useCallback(async () => {
    await audioManager.stopAmbient();
    setCurrentAmbient(null);
    setIsPlaying(false);
  }, []);

  // Set bell volume (0.0 to 1.0)
  const setBellVolume = useCallback((volume) => {
    audioManager.setBellVolume(volume);
  }, []);

  // Set ambient volume (0.0 to 1.0)
  const setAmbientVolume = useCallback((volume) => {
    audioManager.setAmbientVolume(volume);
  }, []);

  return {
    isInitialized,
    isPlaying,
    currentAmbient,
    playBell,
    playAmbient,
    pauseAmbient,
    resumeAmbient,
    stopAmbient,
    setBellVolume,
    setAmbientVolume,
  };
};
