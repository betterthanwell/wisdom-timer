import { testingTools } from './testingTools';

// What the ?debug panel shows: the latest audio events, newest last. Nothing
// is kept unless the panel is on.
const MAX_ENTRIES = 50;

export const createDebugLog = (enabled) => {
  let entries = [];
  let nextId = 1;
  const listeners = new Set();
  return {
    add(message) {
      if (!enabled) return;
      const time = new Date().toLocaleTimeString([], { hour12: false });
      entries = [...entries.slice(1 - MAX_ENTRIES), { id: nextId++, time, message }];
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    entries: () => entries,
  };
};

export const debugLog = createDebugLog(testingTools.debug);
