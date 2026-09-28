import { recitationStep, splitWords } from './recitation';

// Itipi so: the recollection of the Buddha, the Dhamma and the Saṅgha
// (Pali, with the owner's English). One line shows at a time.
export const ITIPISO_LINES = [
  {
    section: 'buddha',
    pali: 'Itipi so bhagavā arahaṃ sammāsambuddho',
    english: 'That Blessed One is perfected, a fully awakened Buddha,',
  },
  {
    section: 'buddha',
    pali: 'vijjācaraṇasampanno sugato lokavidū',
    english: 'accomplished in knowledge and conduct, holy, knower of the world,',
  },
  {
    section: 'buddha',
    pali: 'anuttaro purisadammasārathi satthā devamanussānaṃ buddho bhagavā’ti.',
    english: 'supreme guide for those who wish to train, teacher of gods and humans, awakened, blessed.',
  },
  {
    section: 'dhamma',
    pali: 'Svākkhāto bhagavatā dhammo',
    english: 'The teaching is well explained by the Buddha—',
  },
  {
    section: 'dhamma',
    pali: 'sandiṭṭhiko akāliko ehipassiko',
    english: 'visible in this very life, immediately effective, inviting inspection,',
  },
  {
    section: 'dhamma',
    pali: 'opaneyyiko paccattaṃ veditabbo viññūhī’ti.',
    english: 'relevant, so that sensible people can know it for themselves.',
  },
  {
    section: 'sangha',
    pali: 'Suppaṭipanno bhagavato sāvakasaṅgho,',
    english: 'The Saṅgha of the Buddha’s disciples is practicing the way that’s good,',
  },
  { section: 'sangha', pali: 'ujuppaṭipanno bhagavato sāvakasaṅgho,', english: 'straightforward,' },
  { section: 'sangha', pali: 'ñāyappaṭipanno bhagavato sāvakasaṅgho,', english: 'methodical,' },
  { section: 'sangha', pali: 'sāmīcippaṭipanno bhagavato sāvakasaṅgho,', english: 'and proper.' },
  {
    section: 'sangha',
    pali: 'yadidaṃ cattāri purisayugāni, aṭṭha purisapuggalā.',
    english: 'It consists of the four pairs, the eight individuals.',
  },
  {
    section: 'sangha',
    pali: 'Esa bhagavato sāvakasaṅgho',
    english: 'This is the Saṅgha of the Buddha’s disciples',
  },
  {
    section: 'sangha',
    pali: 'āhuneyyo pāhuneyyo dakkhiṇeyyo añjalikaraṇīyo,',
    english:
      'that is worthy of offerings dedicated to the gods, worthy of hospitality, worthy of a religious donation, worthy of greeting with joined palms,',
  },
  {
    section: 'sangha',
    pali: 'anuttaraṃ puññakkhettaṃ lokassā’ti.',
    english: 'and is the supreme field of merit for the world.',
  },
];

export const paliWords = (line) => splitWords(line.pali);

// Rests, in words' time, after a section and before beginning again. The
// line just finished stays on screen through them.
const SECTION_REST = 2;
const END_REST = 4;

// Each line's time in words, its rest included
const LINE_UNITS = ITIPISO_LINES.map((line, index) => {
  const next = ITIPISO_LINES[index + 1];
  const rest = !next ? END_REST : next.section !== line.section ? SECTION_REST : 0;
  return paliWords(line).length + rest;
});

// Which line to show after `elapsed` seconds at `pace` seconds a word
// (recitationStep: `line` indexes ITIPISO_LINES)
export const itipisoStep = (elapsed, pace) => recitationStep(LINE_UNITS, elapsed, pace);
