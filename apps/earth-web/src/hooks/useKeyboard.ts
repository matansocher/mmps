import { useEffect, useLayoutEffect, useRef } from 'react';

export type KeyHandlers = Partial<Record<string, (event: KeyboardEvent) => void>>;

const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function useKeyboard(handlers: KeyHandlers): void {
  const ref = useRef(handlers);
  useLayoutEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== 'Escape' && isTyping(event.target)) return;
      const handler = ref.current[event.key] ?? ref.current[event.key.toLowerCase()];
      if (!handler) return;
      event.preventDefault();
      handler(event);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
