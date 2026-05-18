import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { TodayResponse } from '../types';
import { LiveMatchCard } from '../components/LiveMatchCard';
import { LeagueSection } from '../components/LeagueSection';
import { EmptyState } from '../components/EmptyState';
import { BottomNav } from '../components/BottomNav';

const DATE_FMT = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' });

export function HomePage() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    api.today().then(setData).catch((e) => setError(String(e)));
  }, []);

  const dateLabel = data ? DATE_FMT.format(new Date(data.date + 'T00:00:00')) : '';
  const hasAnything = data && (data.live.length > 0 || data.groups.some((g) => g.matches.length > 0));

  return (
    <div className="min-h-full bg-bg-base flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-bg-base/85 backdrop-blur border-b border-border-subtle z-10">
        <h1 className="text-text-primary font-bold text-lg">⚽ Coach</h1>
        <span className="text-text-secondary text-sm">{dateLabel}</span>
      </header>

      <main className="flex-1 p-4 space-y-6">
        {error && <EmptyState title="לא הצלחתי לטעון נתונים" hint={error} />}
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

            {!hasAnything && <EmptyState title="אין משחקים היום" hint="חזור מחר ⚽" />}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
