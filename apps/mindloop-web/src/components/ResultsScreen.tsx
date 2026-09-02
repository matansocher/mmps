import { motion } from 'framer-motion';
import type { Category, GameResult } from '../lib/types';
import { Button } from './Button';

interface Props {
  category: Category;
  result: GameResult;
  best: number;
  isNewBest: boolean;
  onReplay: () => void;
  onHome: () => void;
}

export function ResultsScreen({ category, result, best, isNewBest, onReplay, onHome }: Props) {
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
