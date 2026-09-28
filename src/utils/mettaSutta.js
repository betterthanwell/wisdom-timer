import { recitationStep, splitWords } from './recitation';

// Karaniya Metta Sutta (Sn 1.8), translated by the Amaravati Sangha, as on
// Access to Insight. Its license asks for the full license text in every copy:
// METTA_SUTTA_LICENSE, shown under the setting's (i) button.
// Two parts, each a list of couplets (the source's line + indented line).
const PARTS = [
  [
    ['This is what should be done', 'By one who is skilled in goodness,'],
    ['And who knows the path of peace:', 'Let them be able and upright,'],
    ['Straightforward and gentle in speech,', 'Humble and not conceited,'],
    ['Contented and easily satisfied,', 'Unburdened with duties and frugal in their ways.'],
    ['Peaceful and calm and wise and skillful,', 'Not proud or demanding in nature.'],
    ['Let them not do the slightest thing', 'That the wise would later reprove.'],
    ['Wishing: In gladness and in safety,', 'May all beings be at ease.'],
    ['Whatever living beings there may be;', 'Whether they are weak or strong, omitting none,'],
    ['The great or the mighty, medium, short or small,', 'The seen and the unseen,'],
    ['Those living near and far away,', 'Those born and to-be-born —'],
    ['May all beings be at ease!'],
  ],
  [
    ['Let none deceive another,', 'Or despise any being in any state.'],
    ['Let none through anger or ill-will', 'Wish harm upon another.'],
    ['Even as a mother protects with her life', 'Her child, her only child,'],
    ['So with a boundless heart', 'Should one cherish all living beings;'],
    ['Radiating kindness over the entire world:', 'Spreading upwards to the skies,'],
    ['And downwards to the depths;', 'Outwards and unbounded,'],
    ['Freed from hatred and ill-will.', 'Whether standing or walking, seated or lying down'],
    ['Free from drowsiness,', 'One should sustain this recollection.'],
    ['This is said to be the sublime abiding.', 'By not holding to fixed views,'],
    ['The pure-hearted one, having clarity of vision,', 'Being freed from all sense desires,'],
    ['Is not born again into this world.'],
  ],
];

// Every couplet in order: its lines, each as words
export const METTA_SUTTA_COUPLETS = PARTS.flatMap((part, partIndex) =>
  part.map((lines, index) => ({
    lines: lines.map(splitWords),
    endsPart: index === part.length - 1 && partIndex < PARTS.length - 1,
  }))
);

export const METTA_SUTTA_SOURCE = {
  title: 'Karaniya Metta Sutta: The Buddha’s Words on Loving-Kindness (Sn 1.8)',
  translator: 'translated from the Pali by The Amaravati Sangha',
  url: 'https://www.accesstoinsight.org/tipitaka/kn/snp/snp.1.08.amar.html',
};

// The license, word for word, and where the translation comes from
export const METTA_SUTTA_LICENSE = [
  '©1994 English Sangha Trust. You may copy, reformat, reprint, republish, and redistribute this work in any medium whatsoever, provided that: (1) you only make such copies, etc. available free of charge; (2) you clearly indicate that any derivatives of this work (including translations) are derived from this source document; and (3) you include the full text of this license in any copies or derivatives of this work. Otherwise, all rights reserved.',
  'From Chanting Book: Morning and Evening Puja and Reflections (Hemel Hempstead: Amaravati Publications, 1994). Used with permission of the English Sangha Trust, Ltd.',
];

// Rests, in words' time: a breath after each couplet, more after the first
// part and before beginning again. The couplet stays on screen through them.
const COUPLET_REST = 1;
const PART_REST = 3;
const END_REST = 4;

const COUPLET_UNITS = METTA_SUTTA_COUPLETS.map(({ lines, endsPart }, index) => {
  const words = lines.reduce((sum, line) => sum + line.length, 0);
  const last = index === METTA_SUTTA_COUPLETS.length - 1;
  return words + (last ? END_REST : endsPart ? PART_REST : COUPLET_REST);
});

// Which couplet to show after `elapsed` seconds at `pace` seconds a word
// (recitationStep: `line` indexes METTA_SUTTA_COUPLETS)
export const mettaSuttaStep = (elapsed, pace) => recitationStep(COUPLET_UNITS, elapsed, pace);
