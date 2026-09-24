import { describe, expect, it } from 'vitest';
import { pickSavedSettings, sanitizeSettings } from './settings';

const defaults = {
  duration: 2700,
  presetDurations: [1800, 2700, 3600, 5400],
  intervalBellsEnabled: false,
  intervalDuration: 300,
  selectedAmbient: null,
  ambientVolume: 0.5,
  bellVolume: 0.7,
};

describe('sanitizeSettings', () => {
  it('keeps valid saved settings', () => {
    const saved = {
      duration: 600,
      intervalBellsEnabled: true,
      intervalDuration: 120,
      selectedAmbient: 'rain',
      ambientVolume: 0.2,
      bellVolume: 1,
    };
    expect(sanitizeSettings(saved, defaults)).toEqual({ ...defaults, ...saved });
  });

  it('uses the defaults when nothing is saved', () => {
    expect(sanitizeSettings({}, defaults)).toEqual(defaults);
    expect(sanitizeSettings(null, defaults)).toEqual(defaults);
    expect(sanitizeSettings('garbage', defaults)).toEqual(defaults);
    expect(sanitizeSettings([1, 2], defaults)).toEqual(defaults);
  });

  it.each([
    ['zero', 0],
    ['negative', -60],
    ['over 99:59', 6000],
    ['fractional', 90.5],
    ['a string', '600'],
    ['NaN', NaN],
  ])('rejects a %s duration', (_name, duration) => {
    expect(sanitizeSettings({ duration }, defaults).duration).toBe(2700);
  });

  it('accepts the shortest and longest durations', () => {
    expect(sanitizeSettings({ duration: 1 }, defaults).duration).toBe(1);
    expect(sanitizeSettings({ duration: 5999 }, defaults).duration).toBe(5999);
  });

  it('only accepts whole-minute intervals from 1 to 30 minutes', () => {
    expect(sanitizeSettings({ intervalDuration: 60 }, defaults).intervalDuration).toBe(60);
    expect(sanitizeSettings({ intervalDuration: 1800 }, defaults).intervalDuration).toBe(1800);
    expect(sanitizeSettings({ intervalDuration: 30 }, defaults).intervalDuration).toBe(300);
    expect(sanitizeSettings({ intervalDuration: 1860 }, defaults).intervalDuration).toBe(300);
    expect(sanitizeSettings({ intervalDuration: 90 }, defaults).intervalDuration).toBe(300);
  });

  it('only accepts a boolean for interval bells', () => {
    expect(sanitizeSettings({ intervalBellsEnabled: 'yes' }, defaults).intervalBellsEnabled).toBe(false);
  });

  it('drops an ambient sound that no longer exists', () => {
    expect(sanitizeSettings({ selectedAmbient: 'wind' }, defaults).selectedAmbient).toBe(null);
    expect(sanitizeSettings({ selectedAmbient: 'ocean' }, defaults).selectedAmbient).toBe('ocean');
    expect(sanitizeSettings({ selectedAmbient: null }, defaults).selectedAmbient).toBe(null);
  });

  it('rejects volumes outside 0-1', () => {
    expect(sanitizeSettings({ bellVolume: 1.5 }, defaults).bellVolume).toBe(0.7);
    expect(sanitizeSettings({ ambientVolume: -0.1 }, defaults).ambientVolume).toBe(0.5);
    expect(sanitizeSettings({ bellVolume: 0 }, defaults).bellVolume).toBe(0);
  });

  it('only accepts a boolean for keeping the screen awake', () => {
    const withDefault = { ...defaults, keepScreenAwake: true };
    expect(sanitizeSettings({ keepScreenAwake: false }, withDefault).keepScreenAwake).toBe(false);
    expect(sanitizeSettings({ keepScreenAwake: 'no' }, withDefault).keepScreenAwake).toBe(true);
  });

  it('ignores saved keys that are not settings', () => {
    const result = sanitizeSettings({ presetDurations: [1], isAdmin: true }, defaults);
    expect(result.presetDurations).toEqual(defaults.presetDurations);
    expect(result).not.toHaveProperty('isAdmin');
  });
});

describe('pickSavedSettings', () => {
  it('saves every validated setting, and nothing else', () => {
    const saved = pickSavedSettings({ ...defaults, keepScreenAwake: false, somethingElse: 1 });
    expect(saved).toEqual({
      duration: 2700,
      intervalBellsEnabled: false,
      intervalDuration: 300,
      selectedAmbient: null,
      ambientVolume: 0.5,
      bellVolume: 0.7,
      keepScreenAwake: false,
    });
  });
});
