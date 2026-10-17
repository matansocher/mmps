import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { getLanguage, useLanguage } from '../lib/i18n';
import { diffGames, type GameNotification } from '../lib/notifications';
import type { DashboardResponse } from '../types';

const DEFAULT_REFRESH_INTERVAL_SEC = 30;

export type DashboardState = {
  readonly data: DashboardResponse | null;
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly errorStatus: number | null;
  readonly refreshIntervalSec: number;
  readonly lastFetchedAt: number | null;
  readonly notifications: GameNotification[];
  readonly dismissNotification: (key: string) => void;
  readonly clearNotifications: () => void;
  readonly refresh: () => void;
};

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { readonly children: ReactNode }) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const inFlight = useRef(false);
  const dataRef = useRef<DashboardResponse | null>(null);
  const { setLanguage } = useLanguage();

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const next = await api.dashboard();
      // A new device starts in the default language; switch to the saved one (this remounts and refetches).
      if (next.preferences.language && next.preferences.language !== getLanguage()) {
        setLanguage(next.preferences.language);
        return;
      }
      const previous = dataRef.current;
      // Notifications live until the next poll replaces them; the first load has nothing to compare against.
      if (previous && previous.date === next.date) setNotifications(diffGames(previous.games, next.games, next.preferences.eventTypes));
      dataRef.current = next;
      setData(next);
      setErrorStatus(null);
    } catch (err) {
      setErrorStatus(err instanceof ApiError ? err.status : 0);
    } finally {
      inFlight.current = false;
      setRefreshing(false);
      setLoading(false);
      setLastFetchedAt(Date.now());
    }
  }, [setLanguage]);

  const refreshIntervalSec = data?.preferences.refreshIntervalSec ?? DEFAULT_REFRESH_INTERVAL_SEC;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') void load();
      }, refreshIntervalSec * 1000);
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
  }, [load, refreshIntervalSec]);

  const value: DashboardState = {
    data,
    loading,
    refreshing,
    errorStatus,
    refreshIntervalSec,
    lastFetchedAt,
    notifications,
    dismissNotification: (key) => setNotifications((list) => list.filter((n) => n.key !== key)),
    clearNotifications: () => setNotifications([]),
    refresh: () => void load(),
  };
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider');
  return ctx;
}
