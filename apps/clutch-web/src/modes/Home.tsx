import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import type { League } from '../types';
import { LEAGUES } from '../lib/leagues';
import { loadProfile, statsFor, type LeagueStats } from '../lib/storage';
import { haptic } from '../lib/haptics';

const LEAGUE_IDS = Object.keys(LEAGUES) as League[];

export function Home() {
  const [, navigate] = useLocation();
  const profile = loadProfile();

  const best = (pick: (s: LeagueStats) => number) => Math.max(...LEAGUE_IDS.map((l) => pick(statsFor(profile, l))));
  const bestBracket = best((s) => s.bestBracketScore);
  const bestDecade = best((s) => s.bestDecadeScore);
  const bestRapid = best((s) => s.bestRapidStreak);

  const go = (path: string) => {
    haptic('light');
    navigate(path);
  };

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-10 pt-8 safe-b"
    >
      <motion.div variants={item} className="mb-6 text-center">
        <div className="font-display text-5xl tracking-wide text-flame">CLUTCH</div>
        <p className="mt-1 text-sm text-ink-secondary">Playoff trivia · 🏀 NBA &amp; ⚽️ Champions League</p>
      </motion.div>

      <motion.button
        variants={item}
        type="button"
        onClick={() => go('/daily')}
        className="no-select mb-4 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-hoop/25 to-court-card p-5 text-left ring-1 ring-line-strong transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-hoop/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-hoop">Daily Challenge</span>
          {bestBracket > 0 && <span className="text-sm font-bold text-hoop">{bestBracket} pts</span>}
        </div>
        <div className="mt-4 font-display text-4xl tracking-wide">Daily Bracket</div>
        <p className="mt-1 text-sm text-ink-secondary">Rebuild a full playoff bracket, round by round. One shot, one score.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-flame px-4 py-2 text-sm font-bold text-court-base">Play now →</div>
      </motion.button>

      <motion.button
        variants={item}
        type="button"
        onClick={() => go('/decades')}
        className="no-select mb-4 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-flame/25 to-court-card p-5 text-left ring-1 ring-line-strong transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-flame/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-flame">Beat the Clock</span>
          {bestDecade > 0 && <span className="text-sm font-bold text-flame">{bestDecade}/10</span>}
        </div>
        <div className="mt-4 font-display text-4xl tracking-wide">Decade Champions</div>
        <p className="mt-1 text-sm text-ink-secondary">Drag 10 champions into their title years. 30 seconds on the clock.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-flame px-4 py-2 text-sm font-bold text-court-base">Play now →</div>
      </motion.button>

      <motion.button
        variants={item}
        type="button"
        onClick={() => go('/rapid')}
        className="no-select mb-6 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-win/25 to-court-card p-5 text-left ring-1 ring-line-strong transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-win/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-win">Survival</span>
          {bestRapid > 0 && <span className="text-sm font-bold text-win">🔥 {bestRapid}</span>}
        </div>
        <div className="mt-4 font-display text-4xl tracking-wide">Rapid Fire</div>
        <p className="mt-1 text-sm text-ink-secondary">Who advanced? Pick fast — 5 seconds a shot, endless streak.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-flame px-4 py-2 text-sm font-bold text-court-base">Play now →</div>
      </motion.button>
    </motion.div>
  );
}
