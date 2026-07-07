import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { loadProfile, todaysRecord } from '../lib/storage';
import { dailySeasonYear } from '../lib/daily';
import { haptic } from '../lib/haptics';
import { StreakBadge } from '../components/StreakBadge';
import { FIRST_SEASON, LAST_SEASON, SEASONS } from '../lib/playoffs';

export function Home() {
  const [, navigate] = useLocation();
  const profile = loadProfile();
  const today = todaysRecord(profile);
  const year = dailySeasonYear();

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
        <div className="font-display text-5xl tracking-wide text-flame">PLAYOFF IQ</div>
        <p className="mt-1 text-sm text-ink-secondary">
          {SEASONS.length} seasons · {FIRST_SEASON}–{LAST_SEASON} of NBA playoff history
        </p>
      </motion.div>

      <motion.button
        variants={item}
        type="button"
        onClick={() => go('/daily')}
        className="no-select mb-4 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-hoop/25 to-court-card p-5 text-left ring-1 ring-line-strong transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-hoop/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-hoop">Daily Challenge</span>
          <StreakBadge count={profile.dailyStreak} />
        </div>
        <div className="mt-4 font-display text-4xl tracking-wide">Today’s Bracket</div>
        <p className="mt-1 text-sm text-ink-secondary">
          {today ? `Done — ${today.score}/${today.maxScore}. Tap to review.` : `Rebuild the ${year} playoffs. One shot, one score.`}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-flame px-4 py-2 text-sm font-bold text-court-base">
          {today ? 'View result →' : 'Play now →'}
        </div>
      </motion.button>

      <motion.button
        variants={item}
        type="button"
        onClick={() => go('/decades')}
        className="no-select mb-6 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-flame/25 to-court-card p-5 text-left ring-1 ring-line-strong transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-flame/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-flame">Beat the Clock</span>
          {profile.bestDecadeScore > 0 && <span className="text-sm font-bold text-flame">{profile.bestDecadeScore}/10</span>}
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
          {profile.bestRapidStreak > 0 && <span className="text-sm font-bold text-win">🔥 {profile.bestRapidStreak}</span>}
        </div>
        <div className="mt-4 font-display text-4xl tracking-wide">Rapid Fire</div>
        <p className="mt-1 text-sm text-ink-secondary">Who advanced? Pick fast — 5 seconds a shot, endless streak.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-flame px-4 py-2 text-sm font-bold text-court-base">Play now →</div>
      </motion.button>

      <motion.div variants={item} className="mb-6 grid grid-cols-3 gap-3 text-center">
        <Stat label="Best Bracket" value={profile.bestBracketScore} />
        <Stat label="Decade Best" value={profile.bestDecadeScore} />
        <Stat label="Rapid Best" value={profile.bestRapidStreak} />
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-court-card px-2 py-3 ring-1 ring-line-subtle">
      <div className="font-display text-2xl tracking-wide text-flame">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
    </div>
  );
}
