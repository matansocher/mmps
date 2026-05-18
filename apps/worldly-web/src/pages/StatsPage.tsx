import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import { showBackButton } from '../lib/telegram';
import type { GameMode, StatsResponse } from '../types';

const MODE_LABELS: Record<Exclude<GameMode, 'random'>, string> = {
  map: '🗺️ מפה',
  us_map: '🇺🇸 ארה״ב',
  flag: '🏁 דגל',
  capital: '🏛️ עיר בירה',
};

export function StatsPage() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    const cleanup = showBackButton(() => setLocation('/'));
    api.stats().then(setData).catch((e) => setError(String(e)));
    return cleanup;
  }, [setLocation]);

  if (error) return <EmptyState title="שגיאה" hint={error} />;
  if (!data) return <EmptyState title="טוען..." />;

  return (
    <div className="min-h-full bg-bg-base flex flex-col">
      <header className="px-4 py-4 sticky top-0 bg-bg-base/85 backdrop-blur border-b border-border-subtle z-10">
        <h1 className="text-text-primary font-bold text-lg">📊 הסטטיסטיקה שלי</h1>
      </header>

      <main className="flex-1 p-4 space-y-4">
        <section className="grid grid-cols-2 gap-3">
          <Card title="היום" big={`${data.todayCorrect}/${data.todayGames}`} small={data.todayGames ? `${Math.round((data.todayCorrect / data.todayGames) * 100)}%` : '—'} />
          <Card title="סה״כ דיוק" big={`${data.accuracyPct.toFixed(0)}%`} small={`${data.correctGames}/${data.answeredGames}`} />
          <Card title="🤓 רצף תשובות" big={`${data.currentCorrectStreak}`} small={`שיא: ${data.longestCorrectStreak}`} />
          <Card title="💯 רצף ימים" big={`${data.currentDayStreak}`} small={`שיא: ${data.longestDayStreak}`} />
        </section>

        <section>
          <h2 className="text-text-secondary text-sm mb-2">לפי סוג</h2>
          <div className="space-y-2">
            {data.perMode.map((m) => (
              <div key={m.mode} className="flex items-center justify-between rounded-xl bg-bg-card border border-border-subtle px-4 py-3">
                <span className="text-text-primary">{MODE_LABELS[m.mode]}</span>
                <span className="text-text-secondary text-sm">
                  {m.correct}/{m.total} · {m.accuracyPct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </section>

        {data.weakest.length > 0 && (
          <section>
            <h2 className="text-text-secondary text-sm mb-2">📉 הכי הרבה טעויות</h2>
            <div className="space-y-2">
              {data.weakest.map((w) => (
                <div key={w.name} className="flex items-center justify-between rounded-xl bg-bg-card border border-border-subtle px-4 py-3">
                  <span className="text-text-primary">{w.hebrewName}</span>
                  <span className="text-accent-bad text-sm">{w.misses} טעויות</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function Card({ title, big, small }: { readonly title: string; readonly big: string; readonly small: string }) {
  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle px-4 py-3">
      <div className="text-text-secondary text-xs">{title}</div>
      <div className="text-text-primary text-2xl font-bold mt-1">{big}</div>
      <div className="text-text-muted text-xs mt-0.5">{small}</div>
    </div>
  );
}
