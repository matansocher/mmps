import { motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import type { LeagueSelection } from '../lib/leagues';
import { LEAGUES, selectionMeta } from '../lib/leagues';
import { loadProfile, statsFor, liveDailyStreak, liveGridStreak } from '../lib/storage';
import { GAMES, ACCENT } from '../lib/games';
import { useCountUp } from '../lib/useCountUp';

const SEL_IDS = [...(Object.keys(LEAGUES) as LeagueSelection[]), 'all'] as LeagueSelection[];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export function Records() {
  const profile = loadProfile();
  const dailyLive = liveDailyStreak(profile);
  const dailyBest = profile.daily.bestStreak;
  const daysPlayed = Object.keys(profile.daily.results).length;
  const liveCount = useCountUp(dailyLive);

  const gridLive = liveGridStreak(profile);
  const gridGrids = Object.keys(profile.grid.results).length;

  return (
    <div className="min-h-full">
      <TopBar title="Your Records" />
      <motion.div variants={container} initial="hidden" animate="show" className="mx-auto max-w-md px-4 pb-12 pt-4 safe-b">
        {/* Clutch Daily streak block */}
        <motion.div variants={item} className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-flame/30 via-flame/10 to-court-card p-5 ring-1 ring-flame/30">
          <div className="text-xs font-bold uppercase tracking-wider text-flame">⭐ Clutch Daily</div>
          <div className="mt-3 flex items-end gap-6">
            <div>
              <div className="font-display text-6xl leading-none text-flame">🔥 {liveCount}</div>
              <div className="mt-1 text-xs text-ink-muted">Current streak</div>
            </div>
            <div className="flex flex-col gap-2 pb-1">
              <Stat label="Best" value={`🔥 ${dailyBest}`} />
              <Stat label="Days played" value={`${daysPlayed}`} />
            </div>
          </div>
        </motion.div>

        {/* Clutch Grid streak block */}
        <motion.div variants={item} className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-hoop/25 via-hoop/10 to-court-card p-5 ring-1 ring-hoop/30">
          <div className="text-xs font-bold uppercase tracking-wider text-hoop">🔲 Clutch Grid</div>
          <div className="mt-3 flex items-end gap-6">
            <div>
              <div className="font-display text-6xl leading-none text-hoop">🔥 {gridLive}</div>
              <div className="mt-1 text-xs text-ink-muted">Current streak</div>
            </div>
            <div className="flex flex-col gap-2 pb-1">
              <Stat label="Best streak" value={`🔥 ${profile.grid.bestStreak}`} />
              <Stat label="Best grid" value={`${profile.grid.bestFilled}/9`} />
              <Stat label="Top score" value={`${profile.grid.bestScore} pts`} />
            </div>
          </div>
          {gridGrids > 0 && <div className="mt-3 text-xs text-ink-muted">{gridGrids} grid{gridGrids === 1 ? '' : 's'} played</div>}
        </motion.div>

        <motion.div variants={item} className="mb-3 px-1">
          <h2 className="font-display text-xl tracking-wide text-ink-primary">Longest streaks & top scores</h2>
          <p className="text-xs text-ink-muted">Your best in every game, per tournament.</p>
        </motion.div>

        {GAMES.map((g) => {
          const cells = SEL_IDS.map((sel) => ({ sel, meta: selectionMeta(sel), value: g.best(statsFor(profile, sel)) }));
          const top = Math.max(0, ...cells.map((c) => c.value));
          const a = ACCENT[g.accent];
          return (
            <motion.div key={g.path} variants={item} className="mb-3 rounded-2xl bg-court-card p-4 ring-1 ring-line-subtle">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-2xl tracking-wide">{g.title}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${a.text}`}>{g.metric === 'streak' ? 'Streak' : 'Score'}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {cells.map((c) => {
                  const isTop = c.value > 0 && c.value === top;
                  return (
                    <div
                      key={c.sel}
                      className={`flex flex-col items-center gap-1 rounded-xl py-2 ${isTop ? `bg-court-elevated ring-1 ${a.ring}` : ''}`}
                    >
                      <span className="text-lg leading-none" title={c.meta.name}>
                        {c.meta.emoji}
                      </span>
                      <span className={`whitespace-nowrap text-[11px] font-bold ${c.value > 0 ? (isTop ? a.text : 'text-ink-secondary') : 'text-ink-muted'}`}>
                        {c.value > 0 ? g.format(c.value) : '–'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-court-elevated px-3 py-1.5">
      <span className="text-sm font-bold text-ink-primary">{value}</span>
      <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-muted">{label}</span>
    </div>
  );
}
