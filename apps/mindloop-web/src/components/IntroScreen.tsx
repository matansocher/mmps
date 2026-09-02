import { motion } from 'framer-motion';
import type { Category, GameMeta } from '../lib/types';
import { Button } from './Button';
import { GameArt } from './GameArt';

interface Props {
  game: GameMeta;
  category: Category;
  best: number;
  onStart: () => void;
}

export function IntroScreen({ game, category, best, onStart }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-6 py-6 text-center"
    >
      <div
        className="flex h-24 w-24 items-center justify-center rounded-3xl shadow-lg"
        style={{ background: category.soft }}
      >
        <GameArt gameId={game.id} category={game.category} fallback={game.icon} title={game.title} className="h-16 w-16" />
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: category.accent }}>
          {category.label}
        </div>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-800 dark:text-slate-100">{game.title}</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">{game.tagline}</p>
      </div>

      <ol className="w-full space-y-2 rounded-3xl bg-white/70 p-5 text-left shadow-sm ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10">
        {game.howTo.map((line, i) => (
          <li key={i} className="flex gap-3 text-slate-600 dark:text-slate-300">
            <span
              className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: category.accent }}
            >
              {i + 1}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ol>

      <div className="text-sm font-semibold text-slate-400 dark:text-slate-500">
        Best score: <span style={{ color: category.accent }}>{best}</span>
      </div>

      <Button accent={category.accent} className="w-full text-lg" onClick={onStart}>
        Start Game
      </Button>
    </motion.div>
  );
}
