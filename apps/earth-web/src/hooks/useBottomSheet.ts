import { type RefObject, useEffect } from 'react';

const DOCK_COLUMN_PX = 76;

// Lifts the right-hand dock above a bottom-anchored sheet that would otherwise cover it.
export function useBottomSheet(ref: RefObject<HTMLElement | null>, active = true): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || !active) return;
    const root = document.documentElement;
    const update = () => {
      const rect = element.getBoundingClientRect();
      const anchored = window.innerHeight - rect.bottom < 4;
      const overlaps = rect.right > window.innerWidth - DOCK_COLUMN_PX;
      if (anchored && overlaps) root.style.setProperty('--sheet-h', `${window.innerHeight - rect.top + 12}px`);
      else root.style.removeProperty('--sheet-h');
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      root.style.removeProperty('--sheet-h');
    };
  }, [ref, active]);
}
