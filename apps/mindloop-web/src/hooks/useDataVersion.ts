import { useEffect, useState } from 'react';

/**
 * Re-renders the component whenever Mindloop persistent data changes
 * (history, favorites, settings) — including changes from other tabs.
 * Returns a monotonically increasing tick you can use as a dependency.
 */
export function useDataVersion(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener('mindloop:data', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('mindloop:data', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  return tick;
}
