import { useState, useEffect } from 'react';

export const useLocalStorage = (key, initialValue) => {
  // Get initial value from localStorage or use provided initialValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  // Update localStorage when storedValue changes (debounced to prevent excessive writes)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.warn(`Error saving ${key} to localStorage:`, error);
      }
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timeout);
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
};
