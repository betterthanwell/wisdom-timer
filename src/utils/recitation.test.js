// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { recitationStep, splitWords } from './recitation';

describe('splitWords', () => {
  it('splits on spaces, keeping punctuation on its word', () => {
    expect(splitWords('Wishing: In gladness and in safety,')).toEqual(['Wishing:', 'In', 'gladness', 'and', 'in', 'safety,']);
  });

  it('keeps a lone dash with the word before it, so it takes no beat of its own', () => {
    expect(splitWords('Those born and to-be-born —')).toEqual(['Those', 'born', 'and', 'to-be-born —']);
  });
});

describe('recitationStep', () => {
  // Units per entry: its words and any rest after it
  const units = [5, 3, 6];

  it('starts at the first entry', () => {
    expect(recitationStep(units, 0, 2)).toEqual({ step: 0, line: 0, wordOffset: 0 });
  });

  it('gives each entry its units × pace, and how far into it we are', () => {
    expect(recitationStep(units, 9, 2)).toEqual({ step: 0, line: 0, wordOffset: 9 });
    expect(recitationStep(units, 10, 2)).toEqual({ step: 1, line: 1, wordOffset: 0 });
    expect(recitationStep(units, 27, 2)).toEqual({ step: 2, line: 2, wordOffset: 11 });
  });

  it('begins again after the last entry, counting steps on', () => {
    expect(recitationStep(units, 28, 2)).toEqual({ step: 3, line: 0, wordOffset: 0 });
    expect(recitationStep(units, 28 * 2 + 10, 2)).toEqual({ step: 7, line: 1, wordOffset: 0 });
  });

  it('rounds each entry up to whole seconds, since the time sat moves in seconds', () => {
    // At 0.75 s a word: 3.75 s, 2.25 s and 4.5 s become 4, 3 and 5
    expect(recitationStep(units, 3, 0.75)).toMatchObject({ line: 0 });
    expect(recitationStep(units, 4, 0.75)).toEqual({ step: 1, line: 1, wordOffset: 0 });
    expect(recitationStep(units, 7, 0.75)).toEqual({ step: 2, line: 2, wordOffset: 0 });
    expect(recitationStep(units, 12, 0.75)).toEqual({ step: 3, line: 0, wordOffset: 0 });
  });

  it('shows the first entry for nothing sat or a missing pace', () => {
    expect(recitationStep(units, -5, 2)).toEqual({ step: 0, line: 0, wordOffset: 0 });
    expect(recitationStep(units, 10, 0)).toEqual({ step: 0, line: 0, wordOffset: 0 });
    expect(recitationStep(units, 10, undefined)).toEqual({ step: 0, line: 0, wordOffset: 0 });
  });
});
