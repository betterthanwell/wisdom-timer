// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ITIPISO_LINES, itipisoStep } from './itipiso';

const words = (line) => line.pali.split(/\s+/).length;

describe('ITIPISO_LINES', () => {
  it('recollects the Buddha, the Dhamma and the Saṅgha, in that order', () => {
    expect(ITIPISO_LINES.map((line) => line.section)).toEqual([
      'buddha', 'buddha', 'buddha',
      'dhamma', 'dhamma', 'dhamma',
      'sangha', 'sangha', 'sangha', 'sangha', 'sangha', 'sangha', 'sangha', 'sangha',
    ]);
    expect(ITIPISO_LINES[0].pali).toBe('Itipi so bhagavā arahaṃ sammāsambuddho');
    expect(ITIPISO_LINES.at(-1).pali).toBe('anuttaraṃ puññakkhettaṃ lokassā’ti.');
  });

  it('has the English for every line', () => {
    for (const line of ITIPISO_LINES) expect(line.english).toMatch(/\w/);
    expect(ITIPISO_LINES[12].english).toBe(
      'that is worthy of offerings dedicated to the gods, worthy of hospitality, worthy of a religious donation, worthy of greeting with joined palms,'
    );
  });
});

describe('itipisoStep', () => {
  // At 2 s per word: line 0 has 5 words (0-10 s), line 1 has 3 (10-16 s),
  // line 2 has 6 (16-28 s), then a 4 s rest before the Dhamma (28-32 s)
  it('starts with the first line, first word', () => {
    expect(itipisoStep(0, 2)).toEqual({ step: 0, line: 0, wordOffset: 0 });
  });

  it('gives each line its words × pace, and how far into it we are', () => {
    expect(itipisoStep(9, 2)).toEqual({ step: 0, line: 0, wordOffset: 9 });
    expect(itipisoStep(10, 2)).toEqual({ step: 1, line: 1, wordOffset: 0 });
    expect(itipisoStep(16, 2)).toEqual({ step: 2, line: 2, wordOffset: 0 });
    expect(itipisoStep(3, 1)).toEqual({ step: 0, line: 0, wordOffset: 3 });
  });

  it('rests for two words between sections', () => {
    expect(itipisoStep(28, 2)).toEqual({ step: 3, line: null, wordOffset: 0 });
    expect(itipisoStep(31, 2).line).toBe(null);
    expect(itipisoStep(32, 2)).toEqual({ step: 4, line: 3, wordOffset: 0 });
  });

  it('rests for four words at the end, then begins again, counting steps on', () => {
    const lineUnits = ITIPISO_LINES.reduce((sum, line) => sum + words(line), 0);
    const cycle = lineUnits + 2 + 2 + 4; // two section rests and the end rest
    const lastLineEnd = (cycle - 4) * 2;
    // 14 lines and 3 rests per cycle
    expect(itipisoStep(lastLineEnd - 1, 2).line).toBe(13);
    expect(itipisoStep(lastLineEnd, 2)).toEqual({ step: 16, line: null, wordOffset: 0 });
    expect(itipisoStep(cycle * 2 - 1, 2).line).toBe(null);
    expect(itipisoStep(cycle * 2, 2)).toEqual({ step: 17, line: 0, wordOffset: 0 });
  });

  it('shows the first line for nothing sat or a missing pace', () => {
    expect(itipisoStep(-5, 2)).toEqual({ step: 0, line: 0, wordOffset: 0 });
    expect(itipisoStep(10, 0)).toEqual({ step: 0, line: 0, wordOffset: 0 });
    expect(itipisoStep(10, undefined)).toEqual({ step: 0, line: 0, wordOffset: 0 });
  });
});
