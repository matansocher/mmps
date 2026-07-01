import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Course } from '../data/courses';
import { fetchCloudMap, mirrorToLocal, readLocalMap, saveCourse, type ReadMap } from './storage';

type ProgressContextValue = {
  readonly loaded: boolean;
  readonly isRead: (courseId: string, lessonId: string) => boolean;
  readonly toggle: (courseId: string, lessonId: string) => void;
  readonly readCount: (courseId: string) => number;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { readonly children: ReactNode }) {
  // Render instantly from localStorage so the UI is never gated on a slow cloud
  // round-trip (Telegram Desktop can take several seconds).
  const [readMap, setReadMap] = useState<ReadMap>(() => readLocalMap());
  const [loaded, setLoaded] = useState(false);
  // Tracks whether the user changed anything before the cloud response arrived, so
  // a late cloud load never clobbers a fresh in-session edit.
  const editedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(true);
    fetchCloudMap().then((cloud) => {
      if (cancelled || !cloud) return; // null = cloud unavailable/timeout — keep local
      mirrorToLocal(cloud);
      if (editedRef.current) return; // user already edited this session — don't overwrite
      setReadMap(cloud);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isRead = useCallback((courseId: string, lessonId: string) => (readMap[courseId] ?? []).includes(lessonId), [readMap]);

  const readCount = useCallback((courseId: string) => (readMap[courseId] ?? []).length, [readMap]);

  const toggle = useCallback((courseId: string, lessonId: string) => {
    editedRef.current = true;
    setReadMap((prev) => {
      const current = prev[courseId] ?? [];
      const next = current.includes(lessonId) ? current.filter((id) => id !== lessonId) : [...current, lessonId];
      saveCourse(courseId, next);
      return { ...prev, [courseId]: next };
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
