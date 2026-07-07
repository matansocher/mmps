import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import type { League } from '../types';
import { LEAGUES, leagueConfig } from '../lib/leagues';
import { firstSeason, lastSeason, seasonsFor } from '../lib/playoffs';
import { loadProfile, statsFor } from '../lib/storage';
import { haptic } from '../lib/haptics';
import { TopBar } from '../components/TopBar';

export type GameId = 'daily' | 'decades' | 'rapid';

const GAME_META: Record<GameId, { title: string; tagline: string; badge: string; accent: string }> = {
  daily: { title: 'Daily Bracket', tagline: 'Rebuild a full knockout bracket, round by round.', badge: 'Bracket', accent: 'from-hoop/25' },
  decades: { title: 'Decade Champions', tagline: 'Drag 10 champions into their title years. Beat the clock.', badge: 'Beat the Clock', accent: 'from-flame/25' },
  rapid: { title: 'Rapid Fire', tagline: 'Who advanced? 5 seconds a shot — endless streak.', badge: 'Survival', accent: 'from-win/25' },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

function bestFor(game: GameId, league: League): { label: string; value: string } | null {
  const s = statsFor(loadProfile(), league);
  if (game === 'daily') return s.bestBracketScore > 0 ? { label: 'Best', value: `${s.bestBracketScore} pts` } : null;
  if (game === 'decades') return s.bestDecadeScore > 0 ? { label: 'Best', value: `${s.bestDecadeScore}/10` } : null;
  return s.bestRapidStreak > 0 ? { label: 'Best', value: `🔥 ${s.bestRapidStreak}` } : null;
}

export function LeagueSelect({ game }: { game: GameId }) {
  const [, navigate] = useLocation();
  const meta = GAME_META[game];

  const go = (league: League) => {
    haptic('light');
    navigate(`/${game}/${league}`);
  };

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title={meta.title} />
      <motion.div variants={container} initial="hidden" animate="show" className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 pt-4 safe-b">
        <motion.p variants={item} className="mb-6 text-center text-sm text-ink-secondary">
          {meta.tagline}
          <br />
          <span className="text-ink-muted">Pick your league</span>
        </motion.p>

        {(Object.keys(LEAGUES) as League[]).map((league) => {
          const cfg = leagueConfig(league);
          const best = bestFor(game, league);
          return (
            <motion.button
              key={league}
              variants={item}
              type="button"
              onClick={() => go(league)}
              className={`no-select mb-4 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${meta.accent} to-court-card p-5 text-left ring-1 ring-line-strong transition active:scale-[0.99]`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-court-base/40 px-3 py-1 text-xs font-bold uppercase tracking-wider">{cfg.emoji} {cfg.short}</span>
                {best && <span className="text-sm font-bold text-flame">{best.value}</span>}
              </div>
              <div className="mt-4 font-display text-4xl tracking-wide">{cfg.name}</div>
              <p className="mt-1 text-sm text-ink-secondary">
                {seasonsFor(league).length} seasons · {firstSeason(league)}–{lastSeason(league)}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-flame px-4 py-2 text-sm font-bold text-court-base">Play now →</div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
