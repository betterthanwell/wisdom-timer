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

  describe('bell patterns (several strikes)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Bells actually struck (not the preloaded templates created by init)
    const strikes = (name) =>
      bellElements().filter((a) => a.src.includes(name) && !Object.values(manager.bells).includes(a)).length;

    it('rings once by default', async () => {
      await manager.playBell('start');
      await vi.advanceTimersByTimeAsync(20_000);
      expect(strikes('bell-start')).toBe(1);
    });

    it('rings start and end bells several times, 5 seconds apart', async () => {
      manager.playBell('end', 3);
      await vi.advanceTimersByTimeAsync(0);
      expect(strikes('bell-end')).toBe(1);

      await vi.advanceTimersByTimeAsync(4_999);
      expect(strikes('bell-end')).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(strikes('bell-end')).toBe(2);

      await vi.advanceTimersByTimeAsync(5_000);
      expect(strikes('bell-end')).toBe(3);

      await vi.advanceTimersByTimeAsync(20_000);
      expect(strikes('bell-end')).toBe(3);
    });

    it('knocks interval bells 2 seconds apart', async () => {
      manager.playBell('interval', 2);
      await vi.advanceTimersByTimeAsync(2_000);
      expect(strikes('bell-interval')).toBe(2);
    });

    it('plays later strikes at the current bell volume', async () => {
      manager.setBellVolume(0.8);
      manager.playBell('start', 2);
      await vi.advanceTimersByTimeAsync(0);

      manager.setBellVolume(0.3);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(strikes('bell-start')).toBe(2);
      expect(bellElements().at(-1).volume).toBe(0.3);
    });

    it('can cancel strikes that have not rung yet', async () => {
      manager.playBell('start', 3);
      await vi.advanceTimersByTimeAsync(0);
      const first = bellElements().at(-1);

      manager.cancelPendingBells();
      await vi.advanceTimersByTimeAsync(20_000);
      expect(strikes('bell-start')).toBe(1);
      expect(first.paused).toBe(false); // the one already ringing rings out
    });

    it('cancels pending strikes on cleanup', async () => {
      manager.playBell('start', 3);
      await vi.advanceTimersByTimeAsync(0);

      manager.cleanup();
      await vi.advanceTimersByTimeAsync(20_000);
      expect(strikes('bell-start')).toBe(1);
    });
  });

  describe('ambient sound', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('changes the volume of ambient sound that is playing', async () => {
      manager.setAmbientVolume(0.5);
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600); // let the 500ms fade-in finish
      expect(manager.ambientAudio.volume).toBeCloseTo(0.5);

      manager.setAmbientVolume(0.2);
      expect(manager.ambientAudio.volume).toBe(0.2);
    });

    it('scales the ambient volume by a level (gentle ending)', async () => {
      manager.setAmbientVolume(0.8);
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600);

      manager.setAmbientLevel(0.5);
      expect(manager.ambientAudio.volume).toBeCloseTo(0.4);

      // Moving the volume slider during the fade still works
      manager.setAmbientVolume(0.6);
      expect(manager.ambientAudio.volume).toBeCloseTo(0.3);

      manager.setAmbientLevel(1);
      expect(manager.ambientAudio.volume).toBeCloseTo(0.6);
    });

    it('fades in to the scaled volume', async () => {
      manager.setAmbientVolume(0.8);
      manager.setAmbientLevel(0.25);
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600);
      expect(manager.ambientAudio.volume).toBeCloseTo(0.2);
    });

    it('fades in over about 500ms', async () => {
      manager.setAmbientVolume(0.5);
      manager.playAmbient('rain');

      await vi.advanceTimersByTimeAsync(250);
      expect(manager.ambientAudio.volume).toBeGreaterThan(0);
      expect(manager.ambientAudio.volume).toBeLessThan(0.5);

      await vi.advanceTimersByTimeAsync(350);
      expect(manager.ambientAudio.volume).toBeCloseTo(0.5);
    });

    it('applies a volume change made during the fade-in', async () => {
      manager.setAmbientVolume(0.5);
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(200);

      manager.setAmbientVolume(0.2);
      await vi.advanceTimersByTimeAsync(400);
      expect(manager.ambientAudio.volume).toBeCloseTo(0.2);
    });

    it('fades out and stops', async () => {
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600);

      const stopped = manager.stopAmbient();
      await vi.advanceTimersByTimeAsync(600);
      await stopped;
      expect(manager.ambientAudio.paused).toBe(true);
      expect(manager.ambientAudio.currentTime).toBe(0);
      expect(manager.currentAmbient).toBe(null);
    });

    it('stays stopped when stopped while still starting (play then reset quickly)', async () => {
      let finishStarting;
      vi.spyOn(manager.ambientAudio, 'play').mockImplementation(function () {
        this.paused = false;
        return new Promise((resolve) => {
          finishStarting = resolve;
        });
      });

      manager.playAmbient('rain');
      const stopped = manager.stopAmbient();
      finishStarting();
      await vi.advanceTimersByTimeAsync(1000);
      await stopped;

      expect(manager.ambientAudio.paused).toBe(true);
      expect(manager.ambientAudio.volume).toBe(0);
      expect(manager.currentAmbient).toBe(null);
    });

    it('resumes a paused sound from where it was when asked to play it again', async () => {
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600);
      manager.ambientAudio.currentTime = 42;
      manager.pauseAmbient();

      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(0);
      expect(manager.ambientAudio.paused).toBe(false);
      expect(manager.ambientAudio.currentTime).toBe(42);
      expect(manager.currentAmbient).toBe('rain');
    });

    it('switches to a different sound chosen while paused', async () => {
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600);
      manager.ambientAudio.currentTime = 42;
      manager.pauseAmbient();

      manager.playAmbient('ocean');
      await vi.advanceTimersByTimeAsync(600);
      expect(manager.ambientAudio.paused).toBe(false);
      expect(manager.ambientAudio.src).toContain('ocean');
      expect(manager.ambientAudio.currentTime).toBe(0);
      expect(manager.currentAmbient).toBe('ocean');
    });

    it('fully stops ambient sound that is paused (reset while paused)', async () => {
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600);
      manager.ambientAudio.currentTime = 42;
      manager.pauseAmbient();

      await manager.stopAmbient();
      expect(manager.currentAmbient).toBe(null);
      expect(manager.ambientAudio.currentTime).toBe(0);
    });
  });
});

// iOS Safari ignores volume set from JavaScript and always reports 1
class FixedVolumeAudio extends FakeAudio {
  get volume() {
    return 1;
  }

  set volume(_value) {}
}

describe('AudioManager in a browser that ignores volume (iOS)', () => {
  let manager;

  beforeEach(async () => {
    FakeAudio.instances = [];
    vi.stubGlobal('Audio', FixedVolumeAudio);
    manager = new AudioManager();
    await manager.init();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    manager.cleanup();
    vi.unstubAllGlobals();
  });

  it('still stops ambient sound after the fade-out time', async () => {
    manager.playAmbient('rain');
    await vi.advanceTimersByTimeAsync(600);

    let done = false;
    manager.stopAmbient().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toBe(true);
    expect(manager.ambientAudio.paused).toBe(true);
    expect(manager.currentAmbient).toBe(null);
  });
});

// React StrictMode (development) mounts, unmounts and remounts on startup, so
// init() -> cleanup() -> init() happens while the first init is still loading
describe('AudioManager set up twice (React StrictMode)', () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal('Audio', FakeAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the sounds only once', async () => {
    const manager = new AudioManager();
    const first = manager.init();
    manager.cleanup();
    const second = manager.init();
    await Promise.all([first, second]);

    // 3 preloaded bells + 1 ambient element
    expect(FakeAudio.instances).toHaveLength(4);
    expect(manager.isInitialized).toBe(true);
  });

  it('still works after being cleaned up and set up again', async () => {
    const manager = new AudioManager();
    await manager.init();
    manager.cleanup();
    await manager.init();

    await manager.playBell('start');
    expect(bellElements().at(-1).paused).toBe(false);
  });

  it('stops all sound on cleanup', async () => {
    vi.useFakeTimers();
    try {
      const manager = new AudioManager();
      await manager.init();
      await manager.playBell('end');
      const ringing = bellElements().at(-1);
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600);

      manager.cleanup();
      expect(ringing.paused).toBe(true);
      expect(manager.ambientAudio.paused).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
