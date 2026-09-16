import { useEffect, useRef, useState } from 'react';

// Returns how far the user has scrolled through the document, as a 0–100 percentage.
// Reads are batched into a single requestAnimationFrame to keep scroll on the main-thread budget.
export function useReadingProgress(deps: ReadonlyArray<unknown> = []): number {
  const [percent, setPercent] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const compute = () => {
      frame.current = null;
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const next = scrollable <= 0 ? 0 : Math.min(100, Math.max(0, (scrollTop / scrollable) * 100));
      setPercent(next);
    };

    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return percent;
}
