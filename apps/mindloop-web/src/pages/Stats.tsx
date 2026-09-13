import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories';
import { GAMES } from '../lib/games';
import { getBestScore } from '../lib/storage';
import { getLastPlayed, getPlayCount, getStreak, getTotalPlays, getGamesPlayedCount } from '../lib/history';
import { getAchievements, getUnlockedCount } from '../lib/achievements';
import { useDataVersion } from '../hooks/useDataVersion';

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function Stats() {
  const version = useDataVersion();
  const navigate = useNavigate();

  const summary = useMemo(
    () => ({
      totalPlays: getTotalPlays(),
      distinct: getGamesPlayedCount(),
      streak: getStreak(),
      unlocked: getUnlockedCount(),
    }),
    [version],
  );

  const achievements = useMemo(() => getAchievements(), [version]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 sm:text-4xl">Your stats</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Everything is stored on this device only.
        </p>
      </header>

      {/* Summary tiles */}
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Games played" value={summary.totalPlays} icon="🎮" />
        <SummaryTile label="Games tried" value={`${summary.distinct}/${GAMES.length}`} icon="🧠" />
        <SummaryTile label="Day streak" value={summary.streak} icon="🔥" />
        <SummaryTile label="Achievements" value={`${summary.unlocked}/${achievements.length}`} icon="🏅" />
      </div>

      {/* Achievements */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-extrabold text-slate-700 dark:text-slate-100">Achievements</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl p-4 shadow-sm ring-1 transition-colors ${
                a.unlocked
                  ? 'bg-white/80 ring-slate-100 dark:bg-white/10 dark:ring-white/10'
                  : 'bg-white/40 ring-slate-100 dark:bg-white/5 dark:ring-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`text-3xl ${a.unlocked ? '' : 'opacity-30 grayscale'}`} aria-hidden>
                  {a.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-extrabold text-slate-700 dark:text-slate-100">{a.title}</h3>
                    {a.unlocked && <span className="text-xs">✓</span>}
                  </div>
                  <p className="truncate text-xs font-semibold text-slate-400 dark:text-slate-500">{a.description}</p>
                </div>
              </div>
              {!a.unlocked && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                    style={{ width: `${Math.round(a.progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Best scores by category */}
      <section>
        <h2 className="mb-4 text-lg font-extrabold text-slate-700 dark:text-slate-100">Best scores</h2>
        <div className="space-y-8">
          {CATEGORY_ORDER.map((catId) => {
            const category = CATEGORIES[catId];
            const games = GAMES.filter((g) => g.category === catId);
            if (games.length === 0) return null;
            return (
              <div key={catId}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-5 w-1.5 rounded-full" style={{ background: category.accent }} aria-hidden />
                  <h3 className="font-extrabold text-slate-600 dark:text-slate-200">{category.label}</h3>
                </div>
                <div className="overflow-hidden rounded-2xl bg-white/70 shadow-sm ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10">
                  {games.map((g, i) => (
                    <button
                      key={g.id}
                      onClick={() => navigate(`/game/${g.id}`)}
                      className={`ml-tap flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white dark:hover:bg-white/5 ${
                        i > 0 ? 'border-t border-slate-100 dark:border-white/5' : ''
                      }`}
                    >
                      <span className="text-2xl" aria-hidden>{g.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block truncate font-bold text-slate-700 dark:text-slate-100">{g.title}</span>
                        <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500">
                          {getPlayCount(g.id)} play{getPlayCount(g.id) === 1 ? '' : 's'} · {relativeTime(getLastPlayed(g.id))}
                        </span>
                      </span>
                      <span
                        className="rounded-full px-3 py-1 text-sm font-extrabold tabular-nums"
                        style={{ background: category.soft, color: category.accent }}
                      >
                        {getBestScore(g.id)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SummaryTile({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4 text-center shadow-sm ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10">
      <div className="text-2xl" aria-hidden>{icon}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums text-slate-800 dark:text-slate-100">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div>
    </div>
  );
}
