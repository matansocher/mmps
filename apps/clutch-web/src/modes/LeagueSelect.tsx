import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import type { LeagueSelection } from '../lib/leagues';
import { LEAGUES, selectionMeta } from '../lib/leagues';
import { ALL_LEAGUES, firstSeason, lastSeason, seasonsForSelection } from '../lib/playoffs';
import { loadProfile, statsFor } from '../lib/storage';
import { haptic } from '../lib/haptics';
import { TopBar } from '../components/TopBar';

export type GameId = 'daily' | 'decades' | 'rapid' | 'lifted' | 'finalists' | 'chump';

const GAME_META: Record<GameId, { title: string; tagline: string; badge: string; accent: string }> = {
  daily: { title: 'Daily Bracket', tagline: 'Rebuild a full knockout bracket, round by round.', badge: 'Bracket', accent: 'from-hoop/25' },
  decades: { title: 'Decade Champions', tagline: 'Drag 10 champions into their title years. Beat the clock.', badge: 'Beat the Clock', accent: 'from-flame/25' },
  rapid: { title: 'Rapid Fire', tagline: 'Who advanced? 5 seconds a shot — endless streak.', badge: 'Survival', accent: 'from-win/25' },
  lifted: { title: 'Who Lifted It?', tagline: 'Name the champion of each year. One miss ends the streak.', badge: 'Trivia', accent: 'from-hoop/25' },
  finalists: { title: 'Both Finalists', tagline: 'Pick both finalists, then the winner. 10 rounds.', badge: 'Two Picks', accent: 'from-flame/25' },
  chump: { title: 'Champion or Chump?', tagline: 'Team + year flash up. Champions — yes or no? 3 lives.', badge: 'Quick Win', accent: 'from-win/25' },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

function bestFor(game: GameId, league: LeagueSelection): { label: string; value: string } | null {
  const s = statsFor(loadProfile(), league);
  if (game === 'daily') return s.bestBracketScore > 0 ? { label: 'Best', value: `${s.bestBracketScore} pts` } : null;
  if (game === 'decades') return s.bestDecadeScore > 0 ? { label: 'Best', value: `${s.bestDecadeScore}/10` } : null;
  if (game === 'lifted') return s.bestLiftedStreak > 0 ? { label: 'Best', value: `🔥 ${s.bestLiftedStreak}` } : null;
  if (game === 'finalists') return s.bestFinalistsScore > 0 ? { label: 'Best', value: `${s.bestFinalistsScore}/20` } : null;
  if (game === 'chump') return s.bestChumpStreak > 0 ? { label: 'Best', value: `🔥 ${s.bestChumpStreak}` } : null;
  return s.bestRapidStreak > 0 ? { label: 'Best', value: `🔥 ${s.bestRapidStreak}` } : null;
}

const SELECTIONS: readonly LeagueSelection[] = [...(Object.keys(LEAGUES) as LeagueSelection[]), 'all'];

function selectionRange(sel: LeagueSelection): { count: number; from: number; to: number } {
  if (sel !== 'all') return { count: seasonsForSelection(sel).length, from: firstSeason(sel), to: lastSeason(sel) };
  const count = seasonsForSelection('all').length;
  const from = Math.min(...ALL_LEAGUES.map((l) => firstSeason(l)));
  const to = Math.max(...ALL_LEAGUES.map((l) => lastSeason(l)));
  return { count, from, to };
}

export function LeagueSelect({ game }: { game: GameId }) {
  const [, navigate] = useLocation();
  const meta = GAME_META[game];

  const go = (league: LeagueSelection) => {
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

        {SELECTIONS.map((league) => {
          const sm = selectionMeta(league);
          const best = bestFor(game, league);
          const range = selectionRange(league);
          const isAll = league === 'all';
          return (
            <motion.button
              key={league}
              variants={item}
              type="button"
              onClick={() => go(league)}
              className={`no-select mb-4 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${isAll ? 'from-win/25' : meta.accent} to-court-card p-5 text-left ring-1 ${isAll ? 'ring-win/40' : 'ring-line-strong'} transition active:scale-[0.99]`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-court-base/40 px-3 py-1 text-xs font-bold uppercase tracking-wider">{sm.emoji} {sm.short}</span>
                {best && <span className="text-sm font-bold text-flame">{best.value}</span>}
              </div>
              <div className="mt-4 font-display text-4xl tracking-wide">{sm.name}</div>
              <p className="mt-1 text-sm text-ink-secondary">
                {isAll ? `${range.count} seasons · every tournament` : `${range.count} seasons · ${range.from}–${range.to}`}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-flame px-4 py-2 text-sm font-bold text-court-base">Play now →</div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
