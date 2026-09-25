import { useCallback, useEffect, useRef, useState } from 'react';
import { sessionClock } from '../utils/testingTools';

// A short countdown before a session starts, so you can get comfortable.
// begin(seconds, onDone) starts it; onDone is called once at the end unless
// cancel() is called first. Like useTimer, it's computed from the clock, with
// a one-off wake-up at the end in case the repeating timer is throttled.
export const useSettleCountdown = () => {
  const [endAt, setEndAt] = useState(null);
  const [settleRemaining, setSettleRemaining] = useState(0);
  const onDoneRef = useRef(null);

  const begin = useCallback((seconds, onDone) => {
    onDoneRef.current = onDone;
    setSettleRemaining(seconds);
    setEndAt(sessionClock.now() + seconds * 1000);
  }, []);

  const cancel = useCallback(() => {
    setEndAt(null);
  }, []);

  useEffect(() => {
    if (endAt === null) return;

    let done = false;
    const tick = () => {
      if (done) return;
      const left = Math.max(0, Math.ceil((endAt - sessionClock.now()) / 1000));
      setSettleRemaining(left);
      if (left === 0) {
        done = true;
        setEndAt(null);
        onDoneRef.current?.();
      }
    };

    const interval = setInterval(tick, 250);
    const wakeUp = setTimeout(tick, Math.max(0, sessionClock.realDelay(endAt - sessionClock.now())));
    return () => {
      done = true;
      clearInterval(interval);
      clearTimeout(wakeUp);
    };
  }, [endAt]);

  return { isSettling: endAt !== null, settleRemaining, begin, cancel };
};
