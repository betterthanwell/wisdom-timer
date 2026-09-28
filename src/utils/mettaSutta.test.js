// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { METTA_SUTTA_COUPLETS, METTA_SUTTA_LICENSE, mettaSuttaStep } from './mettaSutta';

const text = (couplet) => couplet.lines.map((line) => line.join(' ')).join(' / ');

describe('METTA_SUTTA_COUPLETS', () => {
  it('has the whole text as couplets, in two parts', () => {
    expect(METTA_SUTTA_COUPLETS).toHaveLength(22);
    expect(text(METTA_SUTTA_COUPLETS[0])).toBe('This is what should be done / By one who is skilled in goodness,');
    expect(text(METTA_SUTTA_COUPLETS[10])).toBe('May all beings be at ease!');
    expect(METTA_SUTTA_COUPLETS.filter((couplet) => couplet.endsPart)).toEqual([METTA_SUTTA_COUPLETS[10]]);
    expect(text(METTA_SUTTA_COUPLETS.at(-1))).toBe('Is not born again into this world.');
  });

  it('keeps the dash with the word before it', () => {
    expect(METTA_SUTTA_COUPLETS[9].lines[1]).toEqual(['Those', 'born', 'and', 'to-be-born —']);
  });
});

describe('METTA_SUTTA_LICENSE', () => {
  it('is the full license, which asks to be included in every copy', () => {
    expect(METTA_SUTTA_LICENSE[0]).toMatch(/^©1994 English Sangha Trust\. You may copy/);
    expect(METTA_SUTTA_LICENSE[0]).toMatch(/include the full text of this license in any copies or derivatives of this work\. Otherwise, all rights reserved\.$/);
  });
});

describe('mettaSuttaStep', () => {
  // At 1 s a word: the first couplet has 13 words and a 1-word breath (14 s)
  it('shows each couplet for its words and a breath', () => {
    expect(mettaSuttaStep(0, 1)).toEqual({ step: 0, line: 0, wordOffset: 0 });
    expect(mettaSuttaStep(13, 1)).toEqual({ step: 0, line: 0, wordOffset: 13 });
    expect(mettaSuttaStep(14, 1)).toEqual({ step: 1, line: 1, wordOffset: 0 });
  });

  it('rests longer after the first part than after a couplet', () => {
    const start = (line) => {
      let t = 0;
      while (mettaSuttaStep(t, 1).line !== line) t += 1;
      return t;
    };
    // "May all beings be at ease!": 6 words, then 3 words' rest
    expect(start(11) - start(10)).toBe(9);
  });

  it('takes about three and a half minutes a round at the default 0.75 s a word', () => {
    let t = 1;
    while (mettaSuttaStep(t, 0.75).step < METTA_SUTTA_COUPLETS.length) t += 1;
    expect(t).toBeGreaterThan(180);
    expect(t).toBeLessThan(240);
  });
});
