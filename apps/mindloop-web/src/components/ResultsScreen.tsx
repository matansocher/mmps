import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameEntry } from '../lib/games';
import { pickReason } from '../lib/picker';
import type { Category, GameResult } from '../lib/types';
import { Button } from './Button';

interface Props {
  category: Category;
  result: GameResult;
  best: number;
  isNewBest: boolean;
  onReplay: () => void;
  onHome: () => void;
  /** The coach's suggested next game, chained to keep the session going. */
  nextGame?: GameEntry;
  onNext?: () => void;
}

export function ResultsScreen({ category, result, best, isNewBest, onReplay, onHome, nextGame, onNext }: Props) {
  const nextCategory = nextGame ? CATEGORIES[nextGame.category] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-6 py-6 text-center"
    >
      <motion.div
        initial={{ rotate: -8, scale: 0.8 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 12 }}
        className="text-6xl"
      >
        {isNewBest ? '🏆' : '✨'}
      </motion.div>

      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
          {isNewBest ? 'New Best Score!' : 'Nice work!'}
        </h2>
        <div className="mt-4 text-6xl font-extrabold tabular-nums" style={{ color: category.accent }}>
          {result.score}
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-400 dark:text-slate-500">this run</div>
      </div>

      {result.stats && result.stats.length > 0 && (
        <div className="grid w-full grid-cols-2 gap-3">
          {result.stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/70 p-3 shadow-sm ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10">
              <div className="text-lg font-extrabold text-slate-700 dark:text-slate-100">{s.value}</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="w-full rounded-2xl px-4 py-3 font-bold" style={{ background: category.soft, color: category.accent }}>
        Best score: {best}
      </div>

      {/* Up next: chain the coach's next pick so the session keeps flowing. */}
      {nextGame && nextCategory && onNext && (
        <button
          onClick={onNext}
          className="ml-tap w-full rounded-2xl p-4 text-left shadow-sm ring-1 ring-slate-100 transition-transform active:scale-[0.98] dark:ring-white/10"
          style={{ background: nextCategory.soft }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-2xl shadow-sm" style={{ background: '#fff' }}>
              {nextGame.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wide" style={{ color: nextCategory.accent }}>
                Up next · {pickReason(nextGame)}
              </span>
              <span className="block truncate text-base font-extrabold text-slate-800 dark:text-slate-900">{nextGame.title}</span>
            </span>
            <span className="flex-none text-xl font-extrabold" style={{ color: nextCategory.accent }} aria-hidden>
              →
            </span>
          </div>
        </button>
      )}

      <div className="flex w-full gap-3">
        <Button variant="ghost" className="flex-1" onClick={onHome}>
          Home
        </Button>
        <Button accent={category.accent} className="flex-1" onClick={onReplay}>
          Play Again
        </Button>
      </div>
    </motion.div>
  );
}
