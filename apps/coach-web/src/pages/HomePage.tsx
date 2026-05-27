import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { addDays, dateStringFromOffset, formatDateHeader } from '../lib/format';
import type { TodayResponse } from '../types';
import { LiveMatchCard } from '../components/LiveMatchCard';
import { LeagueSection } from '../components/LeagueSection';
import { EmptyState } from '../components/EmptyState';
import { BottomNav } from '../components/BottomNav';
import { RefreshButton } from '../components/RefreshButton';
import { MatchCardSkeleton } from '../components/MatchCard';
import { CalendarSheet } from '../components/CalendarSheet';

const AUTO_REFRESH_MS = 60_000;

export function HomePage() {
  const today = useMemo(() => dateStringFromOffset(0), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Mirror selectedDate in a ref so async loads can detect stale requests
  // (user pressed arrow before the fetch resolved).
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const loadDay = useCallback(async (date: string, silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    setRefreshing(true);
    try {
      const next = await api.today(date);
      if (date === selectedDateRef.current) {
        setData(next);
        setError(null);
      }
    } catch (e) {
      if (date === selectedDateRef.current) setError(String(e));
    } finally {
      if (date === selectedDateRef.current && !silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial Telegram handshake
  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    api.open().catch(() => {});
  }, []);

  // Load whenever the selected date changes
  useEffect(() => {
    setData(null);
    loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  // Auto-refresh: only while viewing today or a day with live matches
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      if (selectedDate === today || (data && data.live.length > 0)) {
        loadDay(selectedDate, true);
      }
    };
    const id = window.setInterval(tick, AUTO_REFRESH_MS);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [selectedDate, today, data, loadDay]);

  const goPrev = useCallback(() => setSelectedDate((d) => addDays(d, -1)), []);
  const goNext = useCallback(() => setSelectedDate((d) => addDays(d, 1)), []);
  const handleRefresh = useCallback(() => loadDay(selectedDate), [loadDay, selectedDate]);

  const label = formatDateHeader(selectedDate);
  const showEmpty = !loading && !error && data && data.live.length === 0 && !data.groups.some((g) => g.matches.length > 0);

  return (
    <div className="min-h-full bg-bg-base flex flex-col">
      <header className="sticky top-0 bg-bg-base/85 backdrop-blur border-b border-border-subtle z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-text-primary font-bold text-lg">⚽ Coach</h1>
          <RefreshButton busy={refreshing} onClick={handleRefresh} />
        </div>
        <div className="px-4 pb-3 flex items-center justify-between gap-2">
          {/* RTL: right-side arrow goes to previous day, left-side to next day */}
          <ArrowButton direction="prev" onClick={goPrev} ariaLabel="היום הקודם" />
          <DateLabelPicker label={label} onOpen={() => setCalendarOpen(true)} />
          <ArrowButton direction="next" onClick={goNext} ariaLabel="היום הבא" />
        </div>
      </header>

      <main className="flex-1 px-4 py-3">
        {loading && <DaySkeleton />}
        {error && !loading && <EmptyState title="לא הצלחתי לטעון נתונים" hint={error} />}
        {showEmpty && <EmptyState title="אין משחקים ביום זה" hint="נסה יום אחר ⚽" />}
        {data && !loading && (
          <div className="space-y-5">
            {data.live.length > 0 && (
              <div className="space-y-2">
                <div className="text-accent-live font-semibold text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-live animate-live-pulse" />
                  LIVE
                </div>
                <div className="space-y-2">
                  {data.live.map((m) => <LiveMatchCard key={m.id} match={m} />)}
                </div>
              </div>
            )}
            {data.groups.map((g) => (
              <LeagueSection key={g.competition.id} competition={g.competition} matches={g.matches} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
      <CalendarSheet
        open={calendarOpen}
        selected={selectedDate}
        onSelect={(d) => setSelectedDate(d)}
        onClose={() => setCalendarOpen(false)}
      />
    </div>
  );
}

function DateLabelPicker({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <div className="flex-1 text-center">
      <button
        type="button"
        onClick={onOpen}
        className="text-text-primary font-semibold text-base inline-flex items-center gap-1.5 active:opacity-70 transition"
      >
        <span>{label}</span>
        <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
    </div>
  );
}

function ArrowButton({ direction, onClick, ariaLabel }: { direction: 'prev' | 'next'; onClick: () => void; ariaLabel: string }) {
  // In RTL: `prev` (yesterday) sits on the right and points right; `next` sits on the left and points left.
  const points = direction === 'prev' ? 'right' : 'left';
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="h-9 w-9 grid place-items-center rounded-full bg-bg-surface text-text-primary border border-border-subtle active:scale-95 transition"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {points === 'right' ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
      </svg>
    </button>
  );
}

function DaySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => <MatchCardSkeleton key={i} />)}
    </div>
  );
}
