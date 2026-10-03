import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { applyRound, EMPTY_PROGRESS, isProgress, localDay, type Progress, type RoundOutcome, type RoundResult } from '../game/progression';
import { readJson, writeJson } from '../lib/storage';

const KEY = 'progress';
const listeners = new Set<() => void>();
let current: Progress = readJson(KEY, EMPTY_PROGRESS, isProgress);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, () => current);
}

export function recordRound(round: RoundResult, continentOf: (code: string) => string | undefined): RoundOutcome {
  const outcome = applyRound(current, round, localDay(new Date()), continentOf);
  current = outcome.progress;
  writeJson(KEY, current);
  listeners.forEach((listener) => listener());
  return outcome;
}

// Records a finished round exactly once (StrictMode-safe) and returns what it earned.
export function useRoundOutcome(finished: object | null, toResult: () => RoundResult, continentOf: (code: string) => string | undefined): RoundOutcome | null {
  const [saved, setSaved] = useState<{ readonly state: object; readonly outcome: RoundOutcome } | null>(null);
  const recorded = useRef<object | null>(null);
  const toResultRef = useRef(toResult);
  useLayoutEffect(() => {
    toResultRef.current = toResult;
  });

  useEffect(() => {
    if (!finished || recorded.current === finished) return;
    recorded.current = finished;
    setSaved({ state: finished, outcome: recordRound(toResultRef.current(), continentOf) });
  }, [finished, continentOf]);

  return saved && saved.state === finished ? saved.outcome : null;
}
