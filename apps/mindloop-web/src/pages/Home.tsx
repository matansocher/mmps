import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories';
import { GAMES, getGame } from '../lib/games';
import type { GameEntry } from '../lib/games';
import type { CategoryId } from '../lib/types';
import { getFavorites } from '../lib/favorites';
import { getStreak, getTodayGamesPlayed } from '../lib/history';
import { getExploredCount, pickNextGame } from '../lib/picker';
import { playSound } from '../lib/sound';
import { useDataVersion } from '../hooks/useDataVersion';
import { cx } from '../lib/utils';
import { GameCard } from '../components/GameCard';
import { RevealCard } from '../components/RevealCard';
import { DAILY_GOAL } from '../components/DailyProgressModal';

type Filter = 'all' | CategoryId;

export function Home() {
  const version = useDataVersion();
  const navigate = useNavigate();

  // The coach's current pick. Null until the user taps Play (keeps the hero
  // clean and lets the reveal feel intentional).
  const [pick, setPick] = useState<GameEntry | null>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const streak = useMemo(() => getStreak(), [version]);
  const doneToday = useMemo(() => getTodayGamesPlayed(), [version]);
  const explored = useMemo(() => getExploredCount(), [version]);
  const favoriteIds = useMemo(() => getFavorites(), [version]);

  const reveal = () => {
    playSound('start');
    setPick(pickNextGame());
  };

  const shuffle = () => {
    playSound('click');
    setPick((cur) => pickNextGame({ exclude: cur?.id }));
  };

  const play = (game: GameEntry) => {
    playSound('start');
    navigate(`/game/${game.id}`);
  };

  const q = query.trim().toLowerCase();
  const matches = (id: string) => {
    const g = getGame(id);
    if (!g) return false;
    if (filter !== 'all' && g.category !== filter) return false;
    if (!q) return true;
    return (
      g.title.toLowerCase().includes(q) ||
      g.tagline.toLowerCase().includes(q) ||
      CATEGORIES[g.category].label.toLowerCase().includes(q)
    );
  };

  const favoriteGames = favoriteIds.map(getGame).filter((g) => g && matches(g.id));
  const anyResults = GAMES.some((g) => matches(g.id));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
      {/* Hero: one-tap play with an auto-picked game */}
      <section className="mb-12 pt-2 text-center">
        <h1 className="bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-500 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl dark:from-teal-400 dark:via-emerald-300 dark:to-cyan-300">
          Ready to train?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-slate-500 dark:text-slate-400">
          No need to choose — tap play and we&apos;ll pick the game that keeps your mind evenly sharp.
        </p>

        {/* Streak + today's goal */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {streak > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-bold text-amber-700 shadow-sm ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20">
              <span aria-hidden>🔥</span>
              {streak}-day streak
            </span>
          )}
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-4 py-1.5 text-sm font-bold text-teal-700 shadow-sm ring-1 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/20">
            <span aria-hidden>🎯</span>
            Today {Math.min(doneToday, DAILY_GOAL)}/{DAILY_GOAL}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
            <span aria-hidden>🧭</span>
            Explored {explored.explored}/{explored.total}
          </span>
        </div>

        {/* Play button or the revealed pick */}
        <div className="mt-8 flex justify-center">
          {pick ? (
            <RevealCard game={pick} onPlay={() => play(pick)} onShuffle={shuffle} />
          ) : (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={reveal}
              className="ml-tap group relative flex h-40 w-40 flex-col items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-2xl transition-transform sm:h-48 sm:w-48"
              style={{ boxShadow: '0 24px 48px -16px #0d9488' }}
            >
              <span className="text-5xl transition-transform duration-300 group-hover:scale-110 sm:text-6xl" aria-hidden>
                ▶
              </span>
              <span className="mt-1 text-lg font-extrabold sm:text-xl">Play</span>
            </motion.button>
          )}
        </div>
      </section>

      {/* Divider into the browsable catalog */}
      <div className="mb-8 flex items-center gap-4">
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden />
        <span className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Or browse all games
        </span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden />
      </div>

      {/* Search + filter */}
      <div className="mb-8 flex flex-col gap-3">
        <div className="relative mx-auto w-full max-w-md">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
            🔎
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games…"
            aria-label="Search games"
            className="ml-tap w-full rounded-full bg-white/70 py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-700 shadow-sm outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
          {CATEGORY_ORDER.map((catId) => (
            <FilterChip
              key={catId}
              active={filter === catId}
              onClick={() => setFilter(catId)}
              label={CATEGORIES[catId].label}
              color={CATEGORIES[catId].accent}
            />
          ))}
        </div>
      </div>

      {/* Favorites */}
      {favoriteGames.length > 0 && (
        <Section title="Favorites" accent="#f59e0b" icon="⭐">
          <GameRow games={favoriteGames as GameEntry[]} />
        </Section>
      )}

      {/* All games by category */}
      <div className="space-y-10">
        {CATEGORY_ORDER.map((catId) => {
          const category = CATEGORIES[catId];
          const games = GAMES.filter((g) => g.category === catId && matches(g.id));
          if (games.length === 0) return null;

          return (
            <section key={catId}>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-6 w-1.5 rounded-full" style={{ background: category.accent }} aria-hidden />
                <h2 className="text-lg font-extrabold text-slate-700 dark:text-slate-100">{category.label}</h2>
                <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                  {games.length} game{games.length > 1 ? 's' : ''}
                </span>
              </div>

              <GameRow games={games} />
            </section>
          );
        })}

        {!anyResults && (
          <div className="rounded-3xl bg-white/60 py-16 text-center text-slate-400 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:text-slate-500 dark:ring-white/10">
            <div className="text-4xl">🫥</div>
            <p className="mt-3 font-semibold">No games match “{query}”.</p>
          </div>
        )}
      </div>

      <footer className="mt-14 text-center text-sm text-slate-400 dark:text-slate-500">
        Built with ❤️ for brains everywhere. Scores are saved on this device only.
      </footer>
    </div>
  );
}

function GameRow({ games }: { games: GameEntry[] }) {
  return (
    <div
      className={cx(
        // Mobile: single horizontal scroll row. Bleed to the right edge so
        // cards scroll fully, but keep a small left inset so the first card
        // sits just off the page edge (slightly left of the section header).
        'flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pl-1 pr-4',
        '-mr-4 sm:mr-0',
        // sm+: wrap into a dense responsive grid instead of scrolling.
        'sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 sm:pl-0 sm:pr-0 lg:grid-cols-4 xl:grid-cols-5',
        'ml-hide-scrollbar',
      )}
    >
      {games.map((game, i) => (
        <div key={game.id} className="w-36 shrink-0 snap-start sm:w-auto">
          <GameCard game={game} index={i} />
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  accent,
  icon,
  children,
}: {
  title: string;
  accent: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-6 w-1.5 rounded-full" style={{ background: accent }} aria-hidden />
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-700 dark:text-slate-100">
          <span aria-hidden>{icon}</span> {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'ml-tap rounded-full px-3.5 py-1.5 text-sm font-bold shadow-sm ring-1 transition-colors',
        active
          ? 'text-white ring-transparent'
          : 'bg-white/70 text-slate-500 ring-slate-200 hover:text-slate-700 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10 dark:hover:text-white',
      )}
      style={active ? { background: color ?? '#0d9488' } : undefined}
    >
      {label}
    </button>
  );
}
