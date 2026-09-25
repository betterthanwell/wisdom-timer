import { describe, expect, it } from 'vitest';
import { METTA_PHRASES, mettaStep } from './metta';

describe('METTA_PHRASES', () => {
  it('goes from oneself outwards to all beings', () => {
    expect(METTA_PHRASES).toEqual([
      'May I be happy.',
      'May my loved ones be happy.',
      'May those I find difficult be happy.',
      'May all beings everywhere be happy.',
    ]);
  });
});

describe('mettaStep', () => {
  it('starts with the first phrase', () => {
    expect(mettaStep(0, 10)).toEqual({ step: 0, phrase: 0 });
    expect(mettaStep(9, 10)).toEqual({ step: 0, phrase: 0 });
  });

  it('moves to the next phrase every `seconds`', () => {
    expect(mettaStep(10, 10).phrase).toBe(1);
    expect(mettaStep(25, 10).phrase).toBe(2);
    expect(mettaStep(39, 10).phrase).toBe(3);
  });

  it('goes back to the first phrase after the fourth, and keeps counting steps', () => {
    expect(mettaStep(40, 10)).toEqual({ step: 4, phrase: 0 });
    expect(mettaStep(55, 5)).toEqual({ step: 11, phrase: 3 });
  });

  it('treats odd input as the start', () => {
    expect(mettaStep(-3, 10)).toEqual({ step: 0, phrase: 0 });
    expect(mettaStep(30, 0)).toEqual({ step: 0, phrase: 0 });
  });
});
