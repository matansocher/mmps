import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { dateStringFromOffset } from '../lib/format';
import type { TodayResponse } from '../types';
import { LiveMatchCard } from '../components/LiveMatchCard';
import { LeagueSection } from '../components/LeagueSection';
import { EmptyState } from '../components/EmptyState';
import { BottomNav } from '../components/BottomNav';
import { RefreshButton } from '../components/RefreshButton';
import { DayPicker } from '../components/DayPicker';

const DATE_FMT = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' });
const AUTO_REFRESH_MS = 60_000;

export function HomePage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => dateStringFromOffset(0));
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const loadDay = useCallback(async (date: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const next = await api.today(date);
      setData(next);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  useEffect(() => {
    setData(null);
    loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      loadDay(selectedDate);
    };
    const id = window.setInterval(tick, AUTO_REFRESH_MS);
    const onVis = () => {
      if (!document.hidden) loadDay(selectedDate);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [selectedDate, loadDay]);

  const dateLabel = data ? DATE_FMT.format(new Date(data.date + 'T00:00:00')) : '';
  const hasAnything = data && (data.live.length > 0 || data.groups.some((g) => g.matches.length > 0));

  return (
    <div className="min-h-full bg-bg-base flex flex-col">
      <header className="sticky top-0 bg-bg-base/85 backdrop-blur border-b border-border-subtle z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-text-primary font-bold text-lg">⚽ Coach</h1>
          <div className="flex items-center gap-2">
            <span className="text-text-secondary text-sm">{dateLabel}</span>
            <RefreshButton busy={refreshing} onClick={() => loadDay(selectedDate)} />
          </div>
        </div>
        <div className="px-4 pb-3">
          <DayPicker selected={selectedDate} onSelect={setSelectedDate} />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6">
        {error && !data && <EmptyState title="לא הצלחתי לטעון נתונים" hint={error} />}
        {!error && !data && <EmptyState title="טוען..." />}
        {data && (
          <>
            {data.live.length > 0 && (
              <section className="space-y-2">
                <div className="text-accent-live font-semibold text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-live animate-live-pulse" />
                  LIVE
                </div>
                <div className="space-y-2">
                  {data.live.map((m) => <LiveMatchCard key={m.id} match={m} />)}
                </div>
              </section>
            )}

            {data.groups.map((g) => (
              <LeagueSection key={g.competition.id} competition={g.competition} matches={g.matches} />
            ))}

            {!hasAnything && <EmptyState title="אין משחקים ביום זה" hint="נסה תאריך אחר ⚽" />}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
