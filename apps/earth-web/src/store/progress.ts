import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { type GlobeProgressSnapshot, mergeGlobeSnapshots } from '../../../../src/shared/worldly/globe-progress';
import { applyRound, EMPTY_PROGRESS, isProgress, localDay, type Progress, type RoundOutcome, type RoundResult } from '../game/progression';
import { trackRoundFinished } from '../lib/analytics';
import { hasRemoteIdentity, syncProgressSnapshot } from '../lib/progress-api';
import { readJson, writeJson } from '../lib/storage';
import { readAllBestScores, writeBestScores } from './best-scores';

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
  trackRoundFinished(round);
  syncProgress();
  return outcome;
}

const localSnapshot = (): GlobeProgressSnapshot => ({ progress: current, bestScores: readAllBestScores() });

function applySnapshot(remote: GlobeProgressSnapshot): void {
  // Merge with the latest local state so rounds finished while the request was in flight are kept.
  const merged = mergeGlobeSnapshots(localSnapshot(), remote);
  writeBestScores(merged.bestScores);
  current = merged.progress;
  writeJson(KEY, current);
  listeners.forEach((listener) => listener());
}

let syncing = false;
let syncQueued = false;

// Saves progress to the Telegram user's server copy so it follows them across devices.
// Serialized: a call made mid-request runs once more after it finishes.
export function syncProgress(): void {
  if (!hasRemoteIdentity()) return;
  if (syncing) {
    syncQueued = true;
    return;
  }
  syncing = true;
  void (async () => {
    const remote = await syncProgressSnapshot(localSnapshot());
    if (remote) applySnapshot(remote);
    syncing = false;
    if (syncQueued) {
      syncQueued = false;
      syncProgress();
    }
  })();
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
