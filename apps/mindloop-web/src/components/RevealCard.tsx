import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameEntry } from '../lib/games';
import { pickReason } from '../lib/picker';
import { getBestScore } from '../lib/storage';
import { GameArt } from './GameArt';

type Props = {
  game: GameEntry;
  onPlay: () => void;
  onShuffle: () => void;
  /** Copy for the primary action. Defaults to "Play". */
  playLabel?: string;
};

/**
 * The "coach's pick" reveal: shows the auto-selected game with a short reason
 * (which skill it trains), a primary Play action and a secondary Shuffle to
 * re-roll. Used on Home and after a game finishes.
 */
export function RevealCard({ game, onPlay, onShuffle, playLabel = 'Play' }: Props) {
  const category = CATEGORIES[game.category];
  const best = getBestScore(game.id);
  const reason = pickReason(game);

  return (
    <motion.div
      key={game.id}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="mx-auto w-full max-w-sm rounded-3xl bg-white/80 p-6 text-center shadow-xl ring-1 ring-slate-100 backdrop-blur dark:bg-white/10 dark:ring-white/10"
    >
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: category.accent }}>
        {reason}
      </div>

      <motion.div
        initial={{ rotate: -6, scale: 0.85 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.05 }}
        className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-3xl shadow-lg"
        style={{ background: category.soft }}
      >
        <GameArt gameId={game.id} category={game.category} fallback={game.icon} title={game.title} className="h-16 w-16" />
      </motion.div>

      <h2 className="mt-4 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{game.title}</h2>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{game.tagline}</p>

      {best > 0 && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: category.soft, color: category.accent }}>
          <span aria-hidden>🏆</span> Best: {best}
        </div>
      )}

      <button
        onClick={onPlay}
        className="ml-tap mt-6 w-full rounded-2xl py-3.5 text-base font-extrabold text-white shadow-lg transition-transform active:scale-95"
        style={{ background: category.accent, boxShadow: `0 12px 26px -10px ${category.accent}` }}
      >
        {playLabel}
      </button>

      <button
        onClick={onShuffle}
        className="ml-tap mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <span aria-hidden>🎲</span> Shuffle
      </button>
    </motion.div>
  );
}
