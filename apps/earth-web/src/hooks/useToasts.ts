import { useCallback, useState } from 'react';

export type Toast = { readonly id: number; readonly message: string; readonly tone: 'info' | 'error' };

let counter = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (message: string, tone: Toast['tone'] = 'info') => {
      const id = ++counter;
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );
  return { toasts, show, dismiss };
}
