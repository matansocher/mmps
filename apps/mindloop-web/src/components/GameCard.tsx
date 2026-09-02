import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../lib/categories';
import type { GameEntry } from '../lib/games';
import { getBestScore } from '../lib/storage';
import { isFavorite, toggleFavorite } from '../lib/favorites';
import { playSound } from '../lib/sound';
import { cx } from '../lib/utils';
import { GameArt } from './GameArt';

interface Props {
  game: GameEntry;
  index?: number;
  onFavoriteChange?: () => void;
}

export function GameCard({ game, index = 0, onFavoriteChange }: Props) {
  const navigate = useNavigate();
  const category = CATEGORIES[game.category];
  const best = getBestScore(game.id);
  const fav = isFavorite(game.id);

  const onStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(game.id);
    playSound('click');
    onFavoriteChange?.();
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/game/${game.id}`)}
      className={cx(
        'ml-tap group relative flex h-full w-full flex-col overflow-hidden rounded-2xl p-3.5 text-left text-white shadow-md',
        'bg-gradient-to-br',
        category.from,
        category.to,
      )}
    >
      <GameArt
        gameId={game.id}
        category={game.category}
        fallback={game.icon}
        title=""
        className="pointer-events-none absolute -right-5 -top-6 h-24 w-24 opacity-25 transition-transform duration-300 group-hover:scale-110"
      />

      <span
        role="button"
        tabIndex={0}
        onClick={onStar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onStar(e as unknown as React.MouseEvent);
          }
        }}
        aria-label={fav ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/15 text-sm backdrop-blur-sm transition-transform hover:scale-110"
      >
        {fav ? '⭐' : '☆'}
      </span>

      <div className="relative flex flex-1 flex-col">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-sm">
          <GameArt gameId={game.id} category={game.category} fallback={game.icon} title={game.title} className="h-8 w-8" />
        </div>
        <h3 className="mt-2 text-sm font-extrabold leading-tight">{game.title}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs text-white/85">{game.tagline}</p>
        <div className="mt-auto pt-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-sm">
            Best: {best}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
