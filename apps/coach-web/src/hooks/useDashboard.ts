import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { DashboardResponse } from '../types';

const REFRESH_INTERVAL_MS = 30_000;

export type DashboardState = {
  readonly data: DashboardResponse | null;
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly errorStatus: number | null;
  readonly refresh: () => void;
};

export function useDashboard(): DashboardState {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      setData(await api.dashboard());
      setErrorStatus(null);
    } catch (err) {
      setErrorStatus(err instanceof ApiError ? err.status : 0);
    } finally {
      inFlight.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    let timer: number | undefined;
    const schedule = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') void load();
      }, REFRESH_INTERVAL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void load();
        schedule();
      }
    };
    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  return { data, loading, refreshing, errorStatus, refresh: () => void load() };
}
