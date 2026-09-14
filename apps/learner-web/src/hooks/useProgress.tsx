import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { hasRemoteIdentity, learnerApi } from '../lib/api';
import { applyRating, computeStreak, emptyProgress, emptyState, localDateKey } from '../lib/scheduler';
import { loadLocalProgress, saveLocalProgress } from '../lib/storage';
import type { BiteState, LearnerProgress, Rating } from '../lib/types';

type ProgressContextValue = {
  readonly progress: LearnerProgress;
  readonly remote: boolean;
  readonly rateBite: (biteId: string, rating: Rating) => void;
  readonly markRead: (biteId: string) => void;
  readonly setQuizPassed: (biteId: string, passed: boolean) => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

// Merge two progress snapshots, preferring the most recently touched per-bite state.
function mergeProgress(a: LearnerProgress, b: LearnerProgress): LearnerProgress {
  const states: Record<string, BiteState> = { ...a.states };
  for (const [id, remoteState] of Object.entries(b.states)) {
    const localState = states[id];
    if (!localState) {
      states[id] = remoteState;
      continue;
    }
    const localTime = localState.readAt ? Date.parse(localState.readAt) : 0;
    const remoteTime = remoteState.readAt ? Date.parse(remoteState.readAt) : 0;
    states[id] = remoteTime > localTime ? remoteState : localState;
  }
  const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
  const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
  const newest = bTime > aTime ? b : a;
  return { states, streak: Math.max(a.streak, b.streak), lastStudyDate: newest.lastStudyDate, updatedAt: newest.updatedAt };
}

export function ProgressProvider({ children }: { readonly children: ReactNode }) {
  const [progress, setProgress] = useState<LearnerProgress>(() => loadLocalProgress());
  const remote = useMemo(() => hasRemoteIdentity(), []);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull server copy on mount and merge it in.
  useEffect(() => {
    if (!remote) return;
    let cancelled = false;
    learnerApi
      .getProgress()
      .then((res) => {
        if (cancelled || !res?.progress) return;
        setProgress((local) => mergeProgress(local, res.progress));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [remote]);

  // Persist locally on every change, and debounce a best-effort server sync.
  useEffect(() => {
    saveLocalProgress(progress);
    if (!remote) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      learnerApi
        .sync(progress)
        .then((res) => {
          if (res?.progress) setProgress((local) => mergeProgress(local, res.progress));
        })
        .catch(() => {});
    }, 1200);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [progress, remote]);

  const touchStudyDay = useCallback((prev: LearnerProgress, now: Date): Pick<LearnerProgress, 'streak' | 'lastStudyDate'> => {
    return { streak: computeStreak(prev, now), lastStudyDate: localDateKey(now) };
  }, []);

  const rateBite = useCallback(
    (biteId: string, rating: Rating) => {
      setProgress((prev) => {
        const now = new Date();
        const nextState = applyRating(prev.states[biteId], rating, now);
        return {
          ...prev,
          ...touchStudyDay(prev, now),
          states: { ...prev.states, [biteId]: { ...nextState, biteId } },
          updatedAt: now.toISOString(),
        };
      });
    },
    [touchStudyDay],
  );

  const markRead = useCallback((biteId: string) => {
    setProgress((prev) => {
      if (prev.states[biteId]?.readAt) return prev;
      const now = new Date();
      const existing = prev.states[biteId] ?? emptyState(biteId);
      return {
        ...prev,
        states: { ...prev.states, [biteId]: { ...existing, readAt: now.toISOString() } },
        updatedAt: now.toISOString(),
      };
    });
  }, []);

  const setQuizPassed = useCallback((biteId: string, passed: boolean) => {
    setProgress((prev) => {
      const now = new Date();
      const existing = prev.states[biteId] ?? emptyState(biteId);
      return {
        ...prev,
        states: { ...prev.states, [biteId]: { ...existing, quizPassed: existing.quizPassed || passed } },
        updatedAt: now.toISOString(),
      };
    });
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({ progress, remote, rateBite, markRead, setQuizPassed }),
    [progress, remote, rateBite, markRead, setQuizPassed],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}

export { emptyProgress };
