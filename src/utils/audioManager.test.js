import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './audioManager';

// Minimal stand-in for HTMLAudioElement: records state, never makes sound
class FakeAudio {
  static instances = [];
  static failNextPlay = false;

  constructor(src = '') {
    this.src = src;
    this.volume = 1;
    this.paused = true;
    this.loop = false;
    this.preload = '';
    this.currentTime = 0;
    this.listeners = {};
    FakeAudio.instances.push(this);
  }

  load() {}

  play() {
    if (FakeAudio.failNextPlay) {
      FakeAudio.failNextPlay = false;
      return Promise.reject(new Error('NotAllowedError'));
    }
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  remove() {}

  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
    // Pretend every file loads instantly
    if (type === 'canplaythrough') queueMicrotask(fn);
  }

  removeEventListener(type, fn) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((l) => l !== fn);
  }

  emit(type) {
    if (type === 'ended') this.paused = true;
    (this.listeners[type] ?? []).forEach((fn) => fn());
  }
}

const bellElements = () => FakeAudio.instances.filter((a) => a.src.includes('/bells/'));

describe('AudioManager', () => {
  let manager;

  beforeEach(async () => {
    FakeAudio.instances = [];
    FakeAudio.failNextPlay = false;
    vi.stubGlobal('Audio', FakeAudio);
    manager = new AudioManager();
    await manager.init();
  });

  afterEach(() => {
    manager.cleanup();
    vi.unstubAllGlobals();
  });

  describe('bell volume', () => {
    it('plays a bell at the current bell volume', async () => {
      manager.setBellVolume(0.3);
      await manager.playBell('start');

      const bell = bellElements().at(-1);
      expect(bell.paused).toBe(false);
      expect(bell.volume).toBe(0.3);
    });

    it('changes the volume of a bell that is still ringing', async () => {
      manager.setBellVolume(0.8);
      await manager.playBell('end');
      const ringing = bellElements().at(-1);

      manager.setBellVolume(0.2);
      expect(ringing.volume).toBe(0.2);
    });

    it('changes the volume of every overlapping bell', async () => {
      await manager.playBell('start');
      await manager.playBell('interval');
      const [first, second] = bellElements().slice(-2);

      manager.setBellVolume(0.1);
      expect(first.volume).toBe(0.1);
      expect(second.volume).toBe(0.1);
    });

    it('stops tracking a bell once it has finished', async () => {
      manager.setBellVolume(0.5);
      await manager.playBell('start');
      const finished = bellElements().at(-1);
      finished.emit('ended');

      manager.setBellVolume(0.9);
      expect(finished.volume).toBe(0.5);
    });

    it('does not track a bell that failed to play', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      manager.setBellVolume(0.5);
      FakeAudio.failNextPlay = true;
      await manager.playBell('start');
      const failed = bellElements().at(-1);

      manager.setBellVolume(0.9);
      expect(failed.volume).toBe(0.5);
    });

    it('clamps the volume to 0-1', async () => {
      await manager.playBell('start');
      const ringing = bellElements().at(-1);

      manager.setBellVolume(1.5);
      expect(ringing.volume).toBe(1);
      manager.setBellVolume(-0.5);
      expect(ringing.volume).toBe(0);
    });
  });

  describe('ambient volume', () => {
    it('changes the volume of ambient sound that is playing', async () => {
      vi.useFakeTimers();
      try {
        manager.setAmbientVolume(0.5);
        const playing = manager.playAmbient('rain');
        await vi.advanceTimersByTimeAsync(600); // let the 500ms fade-in finish
        await playing;
        expect(manager.ambientAudio.volume).toBeCloseTo(0.5);

        manager.setAmbientVolume(0.2);
        expect(manager.ambientAudio.volume).toBe(0.2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
