import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/api';

export type Resource<T> = {
  readonly data: T | null;
  readonly loading: boolean;
  readonly errorStatus: number | null;
  readonly reload: () => void;
};

// Loads data for a detail page; pollMs (when set) keeps it fresh while the tab is visible.
export function useResource<T>(load: () => Promise<T>, key: string, pollMs?: number): Resource<T> {
  const [state, setState] = useState<{ key: string; data: T | null; errorStatus: number | null }>({ key, data: null, errorStatus: null });
  const loadRef = useRef(load);
  loadRef.current = load;

  const fetchData = useCallback(async () => {
    try {
      const data = await loadRef.current();
      setState({ key, data, errorStatus: null });
    } catch (err) {
      setState((prev) => ({ key, data: prev.key === key ? prev.data : null, errorStatus: err instanceof ApiError ? err.status : 0 }));
    }
  }, [key]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!pollMs) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void fetchData();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [fetchData, pollMs]);

  const current = state.key === key ? state : { data: null, errorStatus: null };
  return { data: current.data, loading: !current.data && current.errorStatus === null, errorStatus: current.errorStatus, reload: () => void fetchData() };
}
