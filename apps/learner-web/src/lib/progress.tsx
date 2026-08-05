import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Course } from '../data/courses';
import { fetchProgress, saveCourseProgress, type ReadMap } from './api';

type ProgressContextValue = {
  readonly loaded: boolean;
  readonly isRead: (courseId: string, lessonId: string) => boolean;
  readonly toggle: (courseId: string, lessonId: string) => void;
  readonly readCount: (courseId: string) => number;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { readonly children: ReactNode }) {
  const [readMap, setReadMap] = useState<ReadMap>({});
  const [loaded, setLoaded] = useState(false);
  // Mirror of readMap for reads inside event handlers, so toggle can compute the
  // next state (and persist it) without putting a side effect in the state updater
  // (which React StrictMode invokes twice — that would double-save).
  const mapRef = useRef<ReadMap>(readMap);
  // Tracks whether the user changed anything before the initial load resolved, so
  // a late server response never clobbers a fresh in-session edit.
  const editedRef = useRef(false);

  const commit = useCallback((next: ReadMap) => {
    mapRef.current = next;
    setReadMap(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProgress().then((progress) => {
      if (cancelled) return;
      if (progress && !editedRef.current) commit(progress);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [commit]);

  const isRead = useCallback((courseId: string, lessonId: string) => (readMap[courseId] ?? []).includes(lessonId), [readMap]);

  const readCount = useCallback((courseId: string) => (readMap[courseId] ?? []).length, [readMap]);

  const toggle = useCallback(
    (courseId: string, lessonId: string) => {
      editedRef.current = true;
      const current = mapRef.current[courseId] ?? [];
      const next = current.includes(lessonId) ? current.filter((id) => id !== lessonId) : [...current, lessonId];
      commit({ ...mapRef.current, [courseId]: next });
      void saveCourseProgress(courseId, next);
    },
    [commit],
  );

  const value = useMemo(() => ({ loaded, isRead, toggle, readCount }), [loaded, isRead, toggle, readCount]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}

// Index of the first lesson the user has not marked read. Returns lessons.length
// when every lesson is read (i.e. resume should land on the quiz / end step).
export function firstUnreadIndex(course: Course, isRead: (courseId: string, lessonId: string) => boolean): number {
  const idx = course.lessons.findIndex((l) => !isRead(course.id, l.id));
  return idx === -1 ? course.lessons.length : idx;
}
