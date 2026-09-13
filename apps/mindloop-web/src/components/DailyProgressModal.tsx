import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getStreak, getTodayGamesPlayed, playedToday } from '../lib/history';

const SEEN_KEY = 'mindloop:dailyModalDay';
export const DAILY_GOAL = 3;

/** Local YYYY-MM-DD */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, todayStr());
  } catch {
    /* ignore */
  }
}

function seenToday(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === todayStr();
  } catch {
    return false;
  }
}

/**
 * Shows a once-per-day welcome modal on first open: the current streak, today's
 * progress toward the daily goal, and a nudge to keep the streak alive.
 */
export function DailyProgressModal() {
  const [open, setOpen] = useState(false);

  const streak = useMemo(() => getStreak(), []);
  const doneToday = useMemo(() => getTodayGamesPlayed(), []);
  const alreadyPlayed = useMemo(() => playedToday(), []);

  useEffect(() => {
    if (!seenToday()) {
      const id = window.setTimeout(() => setOpen(true), 350);
      return () => window.clearTimeout(id);
    }
  }, []);

  const close = () => {
    markSeen();
    setOpen(false);
  };

  const progress = Math.min(1, doneToday / DAILY_GOAL);
  const remaining = Math.max(0, DAILY_GOAL - doneToday);

  const headline = alreadyPlayed
    ? remaining === 0
      ? "Daily goal complete! 🎉"
      : 'Welcome back!'
    : streak > 0
      ? "Keep your streak alive!"
      : 'Ready to train?';

  const message = alreadyPlayed
    ? remaining === 0
      ? "You've hit today's goal. Every extra game is a bonus."
      : `Nice start — ${remaining} more game${remaining > 1 ? 's' : ''} to reach today's goal.`
    : streak > 0
      ? `You're on a ${streak}-day streak. Play one game today so it doesn't break.`
      : `Play ${DAILY_GOAL} games today to start a streak.`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={close} aria-hidden />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Daily progress"
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-3xl shadow-lg">
              {alreadyPlayed && remaining === 0 ? '🎉' : streak > 0 ? '🔥' : '🧠'}
            </div>

            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{headline}</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>

            {streak > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <span aria-hidden>🔥</span>
                {streak}-day streak
              </div>
            )}

            {/* Daily goal progress */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500">
                <span>Today's goal</span>
                <span className="tabular-nums">
                  {Math.min(doneToday, DAILY_GOAL)}/{DAILY_GOAL}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
                />
              </div>
            </div>

            <button
              onClick={close}
              className="ml-tap mt-6 w-full rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 py-3 text-base font-extrabold text-white shadow-lg transition-transform active:scale-95"
            >
              {remaining === 0 ? 'Play more' : "Let's go"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
