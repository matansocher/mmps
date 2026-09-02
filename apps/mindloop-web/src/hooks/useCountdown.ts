import { useCallback, useEffect, useRef, useState } from 'react';

interface UseCountdownOptions {
  seconds: number;
  onExpire?: () => void;
  autoStart?: boolean;
}

/** A simple countdown timer with 100ms resolution. */
export function useCountdown({ seconds, onExpire, autoStart = true }: UseCountdownOptions) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(autoStart);
  const expireRef = useRef(onExpire);
  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, +(r - 0.1).toFixed(1));
        if (next <= 0) {
          window.clearInterval(id);
          setRunning(false);
          // Defer the expire callback so we never call setState (in a
          // parent) from inside another component's state updater.
          window.setTimeout(() => expireRef.current?.(), 0);
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [running]);

  const reset = useCallback(
    (newSeconds?: number) => {
      setRemaining(newSeconds ?? seconds);
      setRunning(true);
    },
    [seconds],
  );

  const stop = useCallback(() => setRunning(false), []);
  const addTime = useCallback((delta: number) => setRemaining((r) => Math.max(0, +(r + delta).toFixed(1))), []);

  return { remaining, running, reset, stop, addTime };
}
