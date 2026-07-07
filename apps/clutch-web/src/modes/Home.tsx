import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import type { LeagueSelection } from '../lib/leagues';
import { LEAGUES } from '../lib/leagues';
import { loadProfile, statsFor, liveDailyStreak, dailyClutchToday, gridToday, liveGridStreak, type LeagueStats } from '../lib/storage';
import { msUntilNextDay } from '../lib/daily';
import { GAMES, ACCENT, type GameDef } from '../lib/games';
import { haptic } from '../lib/haptics';

const SEL_IDS = [...(Object.keys(LEAGUES) as LeagueSelection[]), 'all'] as LeagueSelection[];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export function Home() {
  const [, navigate] = useLocation();
  const profile = loadProfile();

  const bestOf = (pick: (s: LeagueStats) => number) => Math.max(...SEL_IDS.map((l) => pick(statsFor(profile, l))));

  const dailyStreak = liveDailyStreak(profile);
  const dailyDone = dailyClutchToday(profile);
  const atRisk = !dailyDone && dailyStreak > 0;

  const gridStreak = liveGridStreak(profile);
  const gridDone = gridToday(profile);

  const [remaining, setRemaining] = useState(msUntilNextDay());
  useEffect(() => {
    const t = window.setInterval(() => setRemaining(msUntilNextDay()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const go = (path: string) => {
    haptic('light');
    navigate(path);
  };

  const streakGames = GAMES.filter((g) => g.group === 'streak');
  const challengeGames = GAMES.filter((g) => g.group === 'challenge');

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-10 pt-8 safe-b">
      <motion.div variants={item} className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-display text-5xl leading-none tracking-wide text-flame">CLUTCH</div>
          <p className="mt-1 text-sm text-ink-secondary">Playoff trivia · 🏀 ⚽️ 🌍 🇪🇺</p>
        </div>
        <button
          type="button"
          onClick={() => go('/records')}
          className="no-select flex h-11 w-11 items-center justify-center rounded-2xl bg-court-card text-xl ring-1 ring-line-strong transition active:scale-95"
          aria-label="Your records"
        >
          🏆
        </button>
      </motion.div>

      {/* Hero — Clutch Daily (the streak-continuing game) */}
      <motion.button
        variants={item}
        type="button"
        onClick={() => go('/today')}
        className={`no-select mb-6 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-flame/35 via-flame/15 to-court-card p-5 text-left ring-1 transition active:scale-[0.99] ${atRisk ? 'ring-flame/60' : 'ring-flame/30'}`}
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-flame/25 px-3 py-1 text-xs font-bold uppercase tracking-wider text-flame">⭐ Daily · one shot</span>
          {dailyStreak > 0 && (
            <motion.span
              className="text-sm font-bold text-flame"
              animate={atRisk ? { scale: [1, 1.18, 1] } : { scale: 1 }}
              transition={atRisk ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } : { duration: 0.2 }}
            >
              🔥 {dailyStreak}
            </motion.span>
          )}
        </div>
        <div className="mt-4 font-display text-4xl tracking-wide">Clutch Daily</div>
        <p className="mt-1 text-sm text-ink-secondary">
          {dailyDone
            ? '5 champions from every sport — the same 5 for everyone today. See you tomorrow.'
            : atRisk
              ? `Keep your ${dailyStreak}-day streak alive — today's 5 are waiting.`
              : '5 champions from every sport — the same 5 for everyone today.'}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${dailyDone ? 'bg-court-elevated text-ink-primary' : 'bg-flame text-court-base'}`}>
            {dailyDone ? `✓ Done today · ${dailyDone.correct}/${dailyDone.total}` : "Play today's 5 →"}
          </span>
          {dailyDone && <span className="text-xs text-ink-muted">Next in {formatCountdown(remaining)}</span>}
        </div>
      </motion.button>

      {/* Clutch Grid — daily 3×3 */}
      <motion.button
        variants={item}
        type="button"
        onClick={() => go('/grid')}
        className="no-select mb-6 flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-hoop/20 to-court-card p-4 text-left ring-1 ring-line-strong transition active:scale-[0.99]"
      >
        <div className="grid shrink-0 grid-cols-3 grid-rows-3 gap-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className={`h-3 w-3 rounded-[3px] ${gridDone ? (gridDone.cells[i] ? 'bg-win' : 'bg-line-strong') : i % 2 === 0 ? 'bg-hoop/60' : 'bg-court-elevated'}`} />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl leading-none tracking-wide">Clutch Grid</span>
            {gridStreak > 0 && <span className="text-xs font-bold text-flame">🔥 {gridStreak}</span>}
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-secondary">Fill a 3×3 trophy grid — one puzzle a day.</p>
        </div>
        <span className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${gridDone ? 'bg-court-elevated text-ink-primary' : 'bg-hoop text-court-base'}`}>
          {gridDone ? `✓ ${gridDone.filled}/9` : 'Play →'}
        </span>
      </motion.button>

      <Section label="🔥 Beat your streak" hint="Endless — one miss and it's over" games={streakGames} bestOf={bestOf} onPlay={go} />
      <Section label="🎯 Challenges" hint="One shot for the high score" games={challengeGames} bestOf={bestOf} onPlay={go} />
    </motion.div>
  );
}

function Section({
  label,
  hint,
  games,
  bestOf,
  onPlay,
}: {
  label: string;
  hint: string;
  games: readonly GameDef[];
  bestOf: (pick: (s: LeagueStats) => number) => number;
  onPlay: (path: string) => void;
}) {
  return (
    <>
      <motion.div variants={item} className="mb-3 mt-2 flex items-baseline justify-between px-1">
        <h2 className="font-display text-xl tracking-wide text-ink-primary">{label}</h2>
        <span className="text-xs text-ink-muted">{hint}</span>
      </motion.div>
      {games.map((g) => {
        const best = bestOf(g.best);
        const a = ACCENT[g.accent];
        return (
          <motion.button
            key={g.path}
            variants={item}
            type="button"
            onClick={() => onPlay(g.path)}
            className={`no-select mb-4 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${a.grad} to-court-card p-5 text-left ring-1 ring-line-strong transition active:scale-[0.99]`}
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-full ${a.badge} px-3 py-1 text-xs font-bold uppercase tracking-wider`}>{g.badge}</span>
              {best > 0 && <span className={`text-sm font-bold ${a.text}`}>{g.format(best)}</span>}
            </div>
            <div className="mt-4 font-display text-4xl tracking-wide">{g.title}</div>
            <p className="mt-1 text-sm text-ink-secondary">{g.tagline}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-flame px-4 py-2 text-sm font-bold text-court-base">Play now →</div>
          </motion.button>
        );
      })}
    </>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}
