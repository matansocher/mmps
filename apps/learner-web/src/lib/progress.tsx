import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Course } from '../data/courses';
import { loadReadMap, saveReadMap, type ReadMap } from './storage';

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

  useEffect(() => {
    let cancelled = false;
    loadReadMap().then((map) => {
      if (cancelled) return;
      setReadMap(map);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isRead = useCallback((courseId: string, lessonId: string) => (readMap[courseId] ?? []).includes(lessonId), [readMap]);

  const readCount = useCallback((courseId: string) => (readMap[courseId] ?? []).length, [readMap]);

  const toggle = useCallback((courseId: string, lessonId: string) => {
    setReadMap((prev) => {
      const current = prev[courseId] ?? [];
      const next = current.includes(lessonId) ? current.filter((id) => id !== lessonId) : [...current, lessonId];
      const updated = { ...prev, [courseId]: next };
      saveReadMap(updated);
      return updated;
    });
  }, []);

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
