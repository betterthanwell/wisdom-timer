import { useState } from 'react';

// The words of an entry being recited (Itipi so, Metta Sutta), each
// brightening in turn: its animation starts `pace` seconds after the one
// before, offset by how far into the entry the session was when it appeared
// (so a remount mid-entry stays in step). The offset is taken once: changing
// a running animation's delay moves it along its timeline, and re-timing
// every second ran the words at double speed. Remount it (key) for each new
// entry; pausing freezes it with the timer. `lines` is a list of word lists,
// each shown on its own line, the words counting on across them.
export const RecitedWords = ({ lines, pace, wordOffset, isRunning }) => {
  const [startOffset] = useState(wordOffset);
  let index = 0;

  return lines.map((words, lineIndex) => (
    <span key={lineIndex} className={lines.length > 1 ? 'block' : undefined}>
      {words.map((word) => {
        const wordIndex = index++;
        return (
          <span key={wordIndex}>
            {wordIndex > 0 && ' '}
            <span
              className="recitation-word"
              style={{
                animationDuration: `${pace}s`,
                animationDelay: `${wordIndex * pace - startOffset}s`,
                animationPlayState: isRunning ? 'running' : 'paused',
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </span>
  ));
};
