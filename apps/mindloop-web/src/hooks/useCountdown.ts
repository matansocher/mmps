import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameRuntime } from './useGameRuntime';

type UseCountdownOptions = {
  readonly seconds: number;
  readonly onExpire?: () => void;
  readonly autoStart?: boolean;
};

export function useCountdown({ seconds, onExpire, autoStart = true }: UseCountdownOptions) {
  const { clock } = useGameRuntime();
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
    if (deadline.current === null) deadline.current = clock.now() + seconds * 1000;
    const id = clock.setInterval(() => {
      if (deadline.current === null || expired.current) return;
      const next = Math.max(0, (deadline.current - clock.now()) / 1000);
      setRemaining(next);
      if (next <= 0) {
        expired.current = true;
        clock.clearInterval(id);
        setRunning(false);
        expireRef.current?.();
      }
    }, 100);
    return () => clock.clearInterval(id);
  }, [clock, running, seconds]);

  const reset = useCallback(
    (newSeconds?: number) => {
      const duration = Math.max(0, newSeconds ?? seconds);
      deadline.current = clock.now() + duration * 1000;
      expired.current = false;
      setRemaining(duration);
      setRunning(true);
    },
    [clock, seconds],
  );

  const stop = useCallback(() => {
    deadline.current = null;
    setRunning(false);
  }, []);
  const addTime = useCallback(
    (delta: number) => {
      if (deadline.current === null || expired.current || deadline.current <= clock.now()) return;
      deadline.current += delta * 1000;
      setRemaining(Math.max(0, (deadline.current - clock.now()) / 1000));
    },
    [clock],
  );
  const isExpired = useCallback(() => expired.current || (deadline.current !== null && deadline.current <= clock.now()), [clock]);

  return { remaining, running, reset, stop, addTime, isExpired };
}
