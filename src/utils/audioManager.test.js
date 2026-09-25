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

// jsdom has no Web Audio API, so these tests cover browsers without it:
// bells then play on <audio> elements
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

    it('primes a sound muted and pauses it, so it may be started later without a tap (iOS)', async () => {
      manager.primeAmbient('rain');
      expect(manager.ambientAudio.src).toContain('rain');
      expect(manager.ambientAudio.muted).toBe(true);
      await vi.advanceTimersByTimeAsync(0);
      expect(manager.ambientAudio.paused).toBe(true);
      expect(manager.currentAmbient).toBe(null);
    });

    it('plays a primed sound audibly when it really starts', async () => {
      manager.primeAmbient('rain');
      await vi.advanceTimersByTimeAsync(0);

      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600);
      expect(manager.ambientAudio.paused).toBe(false);
      expect(manager.ambientAudio.muted).toBe(false);
      expect(manager.currentAmbient).toBe('rain');
    });

    it('loops ambient sounds but plays a guided meditation once', async () => {
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600);
      expect(manager.ambientAudio.loop).toBe(true);

      manager.playAmbient('metta');
      await vi.advanceTimersByTimeAsync(1200);
      expect(manager.ambientAudio.src).toContain('guided/metta');
      expect(manager.ambientAudio.loop).toBe(false);
    });

    it('plays a guided meditation from a given point, also when resuming it', async () => {
      manager.playAmbient('metta', 42.5);
      await vi.advanceTimersByTimeAsync(600);
      expect(manager.ambientAudio.currentTime).toBe(42.5);

      manager.pauseAmbient();
      manager.playAmbient('metta', 50.25);
      expect(manager.ambientAudio.currentTime).toBe(50.25);
      expect(manager.ambientAudio.paused).toBe(false);
    });

    describe('a guided voice stopped by something else (a call, Siri, the lock screen)', () => {
      let interruptions;
      beforeEach(async () => {
        interruptions = [];
        manager.setInterruptionListener((position) => interruptions.push(position));
        manager.playAmbient('metta', 10);
        await vi.advanceTimersByTimeAsync(600);
        manager.ambientAudio.currentTime = 42.25;
      });
      // What the browser does when the system pauses it
      const pausedFromOutside = () => {
        manager.ambientAudio.paused = true;
        manager.ambientAudio.emit('pause');
      };

      it('reports where the voice stopped', () => {
        pausedFromOutside();
        expect(interruptions).toEqual([42.25]);
        expect(manager.cutShortVoicePosition()).toBe(42.25);
      });

      it('is not reported when the app paused it', () => {
        manager.pauseAmbient();
        manager.ambientAudio.emit('pause');
        expect(interruptions).toEqual([]);
        expect(manager.cutShortVoicePosition()).toBe(null);
      });

      it('is not reported when the recording ended', () => {
        manager.ambientAudio.ended = true;
        pausedFromOutside();
        expect(interruptions).toEqual([]);
        expect(manager.cutShortVoicePosition()).toBe(null);
      });

      it('is no longer cut short once it plays again', () => {
        pausedFromOutside();
        manager.playAmbient('metta', 42.25);
        expect(manager.cutShortVoicePosition()).toBe(null);
      });

      it('is not about ambient sounds, which just loop on', async () => {
        manager.playAmbient('rain');
        await vi.advanceTimersByTimeAsync(1200);
        pausedFromOutside();
        expect(interruptions).toEqual([]);
      });
    });

    it('does not prime over a sound that is already current (e.g. paused mid-session)', async () => {
      manager.playAmbient('ocean');
      await vi.advanceTimersByTimeAsync(600);
      manager.pauseAmbient();

      manager.primeAmbient('rain');
      expect(manager.ambientAudio.src).toContain('ocean');
      expect(manager.ambientAudio.muted).not.toBe(true);
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

// Minimal stand-in for the Web Audio API: records what's connected and started
class FakeAudioNode {
  connect(node) {
    this.connectedTo = node;
    return node;
  }
}

class FakeBufferSource extends FakeAudioNode {
  constructor(context) {
    super();
    this.context = context;
    this.buffer = null;
    this.playing = false;
  }

  start() {
    this.playing = true;
    this.context.started.push(this);
  }

  stop() {
    this.playing = false;
    this.onended?.();
  }

  // Test helper: the sound has played to its end
  finish() {
    this.playing = false;
    this.onended?.();
  }
}

class FakeAudioContext {
  static instances = [];
  static failDecoding = false;
  // Audio taken away by the system (iOS: a call, another app) and not given back
  static stayInterrupted = false;

  constructor() {
    // Browsers create audio contexts suspended until a tap unlocks them
    this.state = 'suspended';
    this.destination = new FakeAudioNode();
    this.started = [];
    FakeAudioContext.instances.push(this);
  }

  // Like browsers, the state changes a moment after resume() is called
  resume() {
    this.resumeCalls = (this.resumeCalls ?? 0) + 1;
    this.resumed = FakeAudioContext.stayInterrupted
      ? new Promise(() => {})
      : Promise.resolve().then(() => {
          this.state = 'running';
        });
    return this.resumed;
  }

  decodeAudioData(data) {
    if (FakeAudioContext.failDecoding) return Promise.reject(new Error('EncodingError'));
    return Promise.resolve({ decodedFrom: data.downloadedFrom });
  }

  createBuffer() {
    return { silence: true };
  }

  createBufferSource() {
    return new FakeBufferSource(this);
  }

  createGain() {
    const gain = new FakeAudioNode();
    gain.gain = { value: 1 };
    return gain;
  }

  addEventListener(type, fn) {
    if (type === 'statechange') (this.stateListeners ??= []).push(fn);
  }

  // Test helper: the system takes the audio away (iOS: a call)
  interrupt() {
    this.state = 'interrupted';
    (this.stateListeners ?? []).forEach((fn) => fn());
  }

  createMediaElementSource(element) {
    const source = new FakeAudioNode();
    source.mediaElement = element;
    this.mediaSources = [...(this.mediaSources ?? []), source];
    return source;
  }
}

describe('AudioManager with Web Audio', () => {
  let manager;
  let downloads; // path -> resolve, for downloads the test finishes itself

  // fetch() stand-in; `slow` downloads wait for the test
  const stubDownloads = ({ slow = [] } = {}) => {
    downloads = {};
    vi.stubGlobal('fetch', vi.fn((path) => {
      const response = { ok: true, arrayBuffer: async () => ({ downloadedFrom: path }) };
      if (!slow.includes(path)) return Promise.resolve(response);
      return new Promise((resolve) => {
        downloads[path] = () => resolve(response);
      });
    }));
  };

  const context = () => FakeAudioContext.instances.at(-1);
  // Bells started through Web Audio (not the silent unlock sound)
  const bellsRung = () => context().started.filter((source) => source.buffer?.decodedFrom);
  const lastBell = () => bellsRung().at(-1);

  beforeEach(() => {
    FakeAudio.instances = [];
    FakeAudioContext.instances = [];
    FakeAudioContext.failDecoding = false;
    FakeAudioContext.stayInterrupted = false;
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('AudioContext', FakeAudioContext);
    stubDownloads();
    manager = new AudioManager();
  });

  afterEach(() => {
    manager.cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete navigator.audioSession;
  });

  const initAndUnlock = async () => {
    await manager.init();
    manager.unlock();
  };

  it('downloads and decodes each bell once, and rings it through Web Audio', async () => {
    await initAndUnlock();
    expect(fetch).toHaveBeenCalledTimes(3);

    await manager.playBell('end');
    expect(lastBell().buffer.decodedFrom).toBe('/audio/bells/bell-end.mp3');
    expect(lastBell().connectedTo).toBe(manager.bellGain);
    expect(manager.bellGain.connectedTo).toBe(context().destination);
    // No <audio> element needed for bells
    expect(bellElements()).toEqual([]);
  });

  it('unlock() resumes the audio context and starts a silent sound (older iOS needs one)', async () => {
    await manager.init();
    expect(context().state).toBe('suspended');

    manager.unlock();
    await context().resumed;
    expect(context().state).toBe('running');
    expect(context().started.map((source) => source.buffer)).toEqual([{ silence: true }]);
  });

  it('rings the start bell through Web Audio in the same tap, while audio is still resuming', async () => {
    await manager.init();
    manager.unlock();
    expect(context().state).toBe('suspended');

    await manager.playBell('start');
    expect(lastBell().buffer.decodedFrom).toBe('/audio/bells/bell-start.mp3');
    expect(bellElements()).toEqual([]);
    // It waited for the tap's own resume: Safari may refuse one asked for
    // outside a tap
    expect(context().resumeCalls).toBe(1);
  });

  it('plays bells at the bell volume, and volume changes reach bells still ringing', async () => {
    await initAndUnlock();
    manager.setBellVolume(0.3);
    expect(manager.bellGain.gain.value).toBe(0.3);

    await manager.playBell('start');
    manager.setBellVolume(0.6);
    expect(manager.bellGain.gain.value).toBe(0.6);
  });

  it('starts at the bell volume set before loading', async () => {
    manager.setBellVolume(0.2);
    await initAndUnlock();
    expect(manager.bellGain.gain.value).toBe(0.2);
  });

  it('asks iOS to treat the sound as media playback, so the silent switch does not mute the bells', async () => {
    navigator.audioSession = { type: 'auto' };
    await manager.init();
    expect(navigator.audioSession.type).toBe('playback');
  });

  it('rings several strikes through Web Audio, and can cancel the ones not yet rung', async () => {
    vi.useFakeTimers();
    await initAndUnlock();

    await manager.playBell('end', 3);
    await vi.advanceTimersByTimeAsync(5000);
    expect(bellsRung()).toHaveLength(2);

    manager.cancelPendingBells();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(bellsRung()).toHaveLength(2);
  });

  it('stops ringing bells on cleanup', async () => {
    await initAndUnlock();
    await manager.playBell('end');
    const ringing = lastBell();

    manager.cleanup();
    expect(ringing.playing).toBe(false);
  });

  it('forgets a bell once it has finished ringing', async () => {
    await initAndUnlock();
    await manager.playBell('end');
    lastBell().finish();
    expect(manager.ringingSources.size).toBe(0);
  });

  it('rings a bell on an <audio> element if it cannot be decoded', async () => {
    FakeAudioContext.failDecoding = true;
    await initAndUnlock();

    await manager.playBell('end');
    expect(bellsRung()).toEqual([]);
    expect(bellElements().at(-1).src).toBe('/audio/bells/bell-end.mp3');
    expect(bellElements().at(-1).paused).toBe(false);
  });

  it('rings a bell on an <audio> element while audio is still locked (no tap yet)', async () => {
    await manager.init();
    await manager.playBell('end');

    expect(bellsRung()).toEqual([]);
    expect(bellElements().at(-1).paused).toBe(false);
  });

  it('rings through Web Audio again once audio comes back from an interruption', async () => {
    await initAndUnlock();
    await manager.resuming;
    context().state = 'interrupted';

    await manager.playBell('end');
    expect(context().state).toBe('running');
    expect(lastBell().buffer.decodedFrom).toBe('/audio/bells/bell-end.mp3');
  });

  it('rings on an <audio> element if audio stays interrupted, rather than late or not at all', async () => {
    vi.useFakeTimers();
    await initAndUnlock();
    await manager.resuming;
    context().state = 'interrupted';
    FakeAudioContext.stayInterrupted = true;

    const ringing = manager.playBell('end');
    await vi.advanceTimersByTimeAsync(1000);
    await ringing;
    expect(bellsRung()).toEqual([]);
    expect(bellElements().at(-1).src).toBe('/audio/bells/bell-end.mp3');
    expect(bellElements().at(-1).paused).toBe(false);
  });

  describe('ambient sound', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('reports an interruption of the audio during a guided voice, pausing it where it was', async () => {
      const interruptions = [];
      await initAndUnlock();
      await vi.advanceTimersByTimeAsync(0);
      manager.setInterruptionListener((position) => interruptions.push(position));
      manager.playAmbient('metta', 30);
      await vi.advanceTimersByTimeAsync(600);

      context().interrupt();
      expect(interruptions).toEqual([30]);
      expect(manager.ambientAudio.paused).toBe(true);
      expect(manager.cutShortVoicePosition()).toBe(30);
    });

    it('reports an interruption before the voice has started (the lead-in), without a position', async () => {
      const interruptions = [];
      await initAndUnlock();
      await vi.advanceTimersByTimeAsync(0);
      manager.setInterruptionListener((position) => interruptions.push(position));

      context().interrupt();
      expect(interruptions).toEqual([null]);
    });

    it('is routed through its own gain once audio is unlocked (iOS ignores <audio> volume)', async () => {
      await manager.init();
      expect(context().mediaSources).toBeUndefined();

      manager.unlock();
      const [source] = context().mediaSources;
      expect(source.mediaElement).toBe(manager.ambientAudio);
      expect(source.connectedTo).toBe(manager.ambientGain);
      expect(manager.ambientGain.connectedTo).toBe(context().destination);

      // Routed once, however often audio is unlocked
      manager.unlock();
      expect(context().mediaSources).toHaveLength(1);
    });

    it('fades in, follows the volume slider and gentle ending through the gain, leaving the element at full volume', async () => {
      await initAndUnlock();
      manager.setAmbientVolume(0.5);
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(0);
      expect(manager.ambientGain.gain.value).toBe(0);

      await vi.advanceTimersByTimeAsync(600);
      expect(manager.ambientGain.gain.value).toBeCloseTo(0.5);
      expect(manager.ambientAudio.volume).toBe(1);

      manager.setAmbientVolume(0.8);
      expect(manager.ambientGain.gain.value).toBeCloseTo(0.8);
      manager.setAmbientLevel(0.5);
      expect(manager.ambientGain.gain.value).toBeCloseTo(0.4);
      expect(manager.ambientAudio.volume).toBe(1);
    });

    it('fades out through the gain and stops', async () => {
      await initAndUnlock();
      manager.playAmbient('rain');
      await vi.advanceTimersByTimeAsync(600);

      manager.stopAmbient();
      await vi.advanceTimersByTimeAsync(600);
      expect(manager.ambientGain.gain.value).toBe(0);
      expect(manager.ambientAudio.paused).toBe(true);
    });
  });

  it('waits at most 2 seconds for a slow bell, and rings it through Web Audio once decoded', async () => {
    vi.useFakeTimers();
    stubDownloads({ slow: ['/audio/bells/bell-start.mp3'] });
    manager = new AudioManager();
    let ready = false;
    manager.init().then(() => {
      ready = true;
    });

    await vi.advanceTimersByTimeAsync(1999);
    expect(ready).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(ready).toBe(true);
    manager.unlock();

    // Not decoded yet: rings on an <audio> element
    await manager.playBell('start');
    expect(bellElements().at(-1).src).toBe('/audio/bells/bell-start.mp3');

    downloads['/audio/bells/bell-start.mp3']();
    await vi.advanceTimersByTimeAsync(0);
    await manager.playBell('start');
    expect(lastBell().buffer.decodedFrom).toBe('/audio/bells/bell-start.mp3');
  });
});
