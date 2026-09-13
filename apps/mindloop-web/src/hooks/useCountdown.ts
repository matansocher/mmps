import { useCallback, useEffect, useRef, useState } from 'react';

type UseCountdownOptions = {
  readonly seconds: number;
  readonly onExpire?: () => void;
  readonly autoStart?: boolean;
};

export function useCountdown({ seconds, onExpire, autoStart = true }: UseCountdownOptions) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(autoStart);
  const deadline = useRef<number | null>(null);
  const expired = useRef(false);
  const expireRef = useRef(onExpire);
  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!running) return;
    if (deadline.current === null) deadline.current = performance.now() + seconds * 1000;
    const id = window.setInterval(() => {
      if (deadline.current === null || expired.current) return;
      const next = Math.max(0, (deadline.current - performance.now()) / 1000);
      setRemaining(next);
      if (next <= 0) {
        expired.current = true;
        window.clearInterval(id);
        setRunning(false);
        expireRef.current?.();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [running, seconds]);

  const reset = useCallback(
    (newSeconds?: number) => {
      const duration = Math.max(0, newSeconds ?? seconds);
      deadline.current = performance.now() + duration * 1000;
      expired.current = false;
      setRemaining(duration);
      setRunning(true);
    },
    [seconds],
  );

  const stop = useCallback(() => {
    deadline.current = null;
    setRunning(false);
  }, []);
  const addTime = useCallback((delta: number) => {
    if (deadline.current === null || expired.current || deadline.current <= performance.now()) return;
    deadline.current += delta * 1000;
    setRemaining(Math.max(0, (deadline.current - performance.now()) / 1000));
  }, []);
  const isExpired = useCallback(() => expired.current || (deadline.current !== null && deadline.current <= performance.now()), []);

  return { remaining, running, reset, stop, addTime, isExpired };
}
