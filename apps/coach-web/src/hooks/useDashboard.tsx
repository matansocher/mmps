import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { celebrateGoal, installAudioUnlock } from '../lib/goal-sound';
import { getLanguage, useLanguage } from '../lib/i18n';
import { diffGames, type GameNotification } from '../lib/notifications';
import { LIVE_POLL_MS, nextPollDelayMs } from '../lib/polling';
import type { DashboardResponse } from '../types';

export type DashboardState = {
  readonly data: DashboardResponse | null;
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly errorStatus: number | null;
  readonly lastFetchedAt: number | null;
  readonly lastSuccessAt: number | null;
  readonly nextRetryAt: number | null;
  readonly online: boolean;
  // Set briefly after a refresh succeeds following failures, so the page can confirm it's fresh again.
  readonly recovered: RecoveredFrom | null;
  readonly notifications: GameNotification[];
  readonly dismissNotification: (key: string) => void;
  readonly clearNotifications: () => void;
  readonly refresh: () => void;
};

export type RecoveredFrom = 'offline' | 'server';

const RECOVERED_MS = 4000;

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { readonly children: ReactNode }) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [recovered, setRecovered] = useState<RecoveredFrom | null>(null);
  const inFlight = useRef(false);
  const failure = useRef<RecoveredFrom | null>(null);
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
      if (previous && previous.date === next.date) {
        const fresh = diffGames(previous.games, next.games, next.preferences.eventTypes);
        setNotifications(fresh);
        // One celebration per poll, however many goals it brought.
        if (fresh.some((n) => n.eventType === 'goal')) celebrateGoal();
      }
      dataRef.current = next;
      setData(next);
      setErrorStatus(null);
      setLastSuccessAt(Date.now());
      if (failure.current) setRecovered(failure.current);
      failure.current = null;
    } catch (err) {
      setErrorStatus(err instanceof ApiError ? err.status : 0);
      failure.current = navigator.onLine ? 'server' : 'offline';
      setRecovered(null);
    } finally {
      inFlight.current = false;
      setRefreshing(false);
      setLoading(false);
      setLastFetchedAt(Date.now());
    }
  }, [setLanguage]);

  useEffect(() => {
    void load();
  }, [load]);

  // Every fetch (success or failure) bumps lastFetchedAt, which re-plans the next poll from the latest games.
  useEffect(() => {
    if (lastFetchedAt === null) return;
    const planned = nextPollDelayMs(dataRef.current?.games ?? []);
    // After a failure retry at the live cadence at most, rather than waiting out a long idle interval.
    const delay = failure.current ? Math.min(planned, LIVE_POLL_MS) : planned;
    setNextRetryAt(lastFetchedAt + delay);
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') void load();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [load, lastFetchedAt]);

  useEffect(() => {
    if (!recovered) return;
    const timer = window.setTimeout(() => setRecovered(null), RECOVERED_MS);
    return () => window.clearTimeout(timer);
  }, [recovered]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      if (failure.current) failure.current = 'offline';
      void load();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [load]);

  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [load]);

  const value: DashboardState = {
    data,
    loading,
    refreshing,
    errorStatus,
    lastFetchedAt,
    lastSuccessAt,
    nextRetryAt,
    online,
    recovered,
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
