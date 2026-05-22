import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { LeaderboardDto } from '../lib/types';
import { BottomNav } from '../components/BottomNav';

export function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.leaderboard().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur px-4 py-3 border-b border-border-subtle">
        <h1 className="text-lg font-bold">🏆 טבלת דירוג</h1>
        {data?.myRank && <p className="text-text-secondary text-sm mt-1">המיקום שלך: #{data.myRank}</p>}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3">
        {loading && <p className="text-text-muted text-center py-8">טוען...</p>}
        {!loading && (!data || data.entries.length === 0) && (
          <p className="text-text-muted text-center py-8">עדיין אין ניחושים. היו הראשונים!</p>
        )}
        {!loading && data && data.entries.length > 0 && (
          <div className="space-y-2">
            {data.entries.map((entry, i) => {
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
              const name = entry.username ? `@${entry.username}` : entry.firstName;
              return (
                <div key={entry.telegramUserId} className="bg-bg-card rounded-lg p-3 flex items-center border border-border-subtle">
                  <span className="text-lg w-8">{medal}</span>
                  <div className="flex-1 mr-2">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-text-muted text-xs mr-2">({entry.guessCount} ניחושים)</span>
                  </div>
                  <span className="score-font text-accent-exact">{entry.points} נק׳</span>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
