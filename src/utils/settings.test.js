// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { pickSavedSettings, sanitizeSettings } from './settings';

const defaults = {
  duration: 2700,
  presetDurations: [1800, 2700, 3600, 5400],
  intervalBellsEnabled: false,
  intervalDuration: 300,
  intervalStart: 300,
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

  it('accepts whole minutes from 1 to 99', () => {
    expect(sanitizeSettings({ duration: 60 }, defaults).duration).toBe(60);
    expect(sanitizeSettings({ duration: 5940 }, defaults).duration).toBe(5940);
  });

  // Lengths used to be set to the second; the custom length is now minutes only
  it.each([
    [750, 780], // 12:30 -> 13 min
    [749, 720],
    [1, 60],
    [5999, 5940],
  ])('rounds a saved %i s to the nearest minute (%i s), from 1 to 99', (duration, rounded) => {
    expect(sanitizeSettings({ duration }, defaults).duration).toBe(rounded);
  });

  it('only accepts whole-minute intervals from 1 to 30 minutes', () => {
    expect(sanitizeSettings({ intervalDuration: 60 }, defaults).intervalDuration).toBe(60);
    expect(sanitizeSettings({ intervalDuration: 1800 }, defaults).intervalDuration).toBe(1800);
    expect(sanitizeSettings({ intervalDuration: 30 }, defaults).intervalDuration).toBe(300);
    expect(sanitizeSettings({ intervalDuration: 1860 }, defaults).intervalDuration).toBe(300);
    expect(sanitizeSettings({ intervalDuration: 90 }, defaults).intervalDuration).toBe(300);
  });

  it('only accepts a whole-minute first woodblock time from 1 to 60 minutes', () => {
    expect(sanitizeSettings({ intervalStart: 60 }, defaults).intervalStart).toBe(60);
    expect(sanitizeSettings({ intervalStart: 3600 }, defaults).intervalStart).toBe(3600);
    expect(sanitizeSettings({ intervalStart: 0 }, defaults).intervalStart).toBe(300);
    expect(sanitizeSettings({ intervalStart: 3660 }, defaults).intervalStart).toBe(300);
    expect(sanitizeSettings({ intervalStart: 90 }, defaults).intervalStart).toBe(300);
  });

  it('only accepts a boolean for metta mode and a listed metta pace', () => {
    expect(sanitizeSettings({ mettaMode: true }, defaults).mettaMode).toBe(true);
    expect(sanitizeSettings({ mettaMode: 'yes' }, defaults).mettaMode).toBe(undefined);
    for (const seconds of [5, 10, 20, 30]) {
      expect(sanitizeSettings({ mettaSeconds: seconds }, defaults).mettaSeconds).toBe(seconds);
    }
    expect(sanitizeSettings({ mettaSeconds: 7 }, defaults).mettaSeconds).toBe(undefined);
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

  it('only accepts the offered settling-in lengths', () => {
    const withDefault = { ...defaults, settleSeconds: 0 };
    expect(sanitizeSettings({ settleSeconds: 5 }, withDefault).settleSeconds).toBe(5);
    expect(sanitizeSettings({ settleSeconds: 60 }, withDefault).settleSeconds).toBe(60);
    expect(sanitizeSettings({ settleSeconds: 15 }, withDefault).settleSeconds).toBe(0);
    // No longer offered
    expect(sanitizeSettings({ settleSeconds: 30 }, withDefault).settleSeconds).toBe(0);
    expect(sanitizeSettings({ settleSeconds: '60' }, withDefault).settleSeconds).toBe(0);
  });

  it('only accepts a boolean for dimming, and a level of 10% to 90%', () => {
    const withDefault = { ...defaults, dimScreen: true, dimLevel: 0.25 };
    expect(sanitizeSettings({ dimScreen: false }, withDefault).dimScreen).toBe(false);
    expect(sanitizeSettings({ dimScreen: 1 }, withDefault).dimScreen).toBe(true);
    expect(sanitizeSettings({ dimLevel: 0.1 }, withDefault).dimLevel).toBe(0.1);
    expect(sanitizeSettings({ dimLevel: 0.9 }, withDefault).dimLevel).toBe(0.9);
    expect(sanitizeSettings({ dimLevel: 0.05 }, withDefault).dimLevel).toBe(0.25);
    expect(sanitizeSettings({ dimLevel: 1 }, withDefault).dimLevel).toBe(0.25);
    expect(sanitizeSettings({ dimLevel: '0.5' }, withDefault).dimLevel).toBe(0.25);
  });

  it('only accepts 1 to 3 bell strikes', () => {
    const withDefault = { ...defaults, startStrikes: 1, endStrikes: 1 };
    expect(sanitizeSettings({ startStrikes: 3 }, withDefault).startStrikes).toBe(3);
    expect(sanitizeSettings({ startStrikes: 4 }, withDefault).startStrikes).toBe(1);
    expect(sanitizeSettings({ endStrikes: 0 }, withDefault).endStrikes).toBe(1);
    expect(sanitizeSettings({ endStrikes: 1.5 }, withDefault).endStrikes).toBe(1);
  });

  it('ignores saved keys that are not settings', () => {
    const result = sanitizeSettings({ presetDurations: [1], isAdmin: true }, defaults);
    expect(result.presetDurations).toEqual(defaults.presetDurations);
    expect(result).not.toHaveProperty('isAdmin');
  });
});

describe('pickSavedSettings', () => {
  it('saves every validated setting, and nothing else', () => {
    const saved = pickSavedSettings({ ...defaults, keepScreenAwake: false, settleSeconds: 20, startStrikes: 3, intervalStrikes: 1, endStrikes: 2, gentleEnding: true, openEnded: true, showBellStrikes: true, mettaMode: true, mettaSeconds: 20, dimScreen: false, dimLevel: 0.5, somethingElse: 1 });
    expect(saved).toEqual({
      duration: 2700,
      intervalBellsEnabled: false,
      intervalDuration: 300,
      intervalStart: 300,
      selectedAmbient: null,
      ambientVolume: 0.5,
      bellVolume: 0.7,
      keepScreenAwake: false,
      settleSeconds: 20,
      startStrikes: 3,
      intervalStrikes: 1,
      endStrikes: 2,
      gentleEnding: true,
      openEnded: true,
      showBellStrikes: true,
      mettaMode: true,
      mettaSeconds: 20,
      dimScreen: false,
      dimLevel: 0.5,
    });
  });
});
