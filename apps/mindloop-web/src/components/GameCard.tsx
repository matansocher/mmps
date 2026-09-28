import { Link } from 'react-router-dom';
import { CATEGORIES } from '../lib/categories';
import { isFavorite, toggleFavorite } from '../lib/favorites';
import type { GameEntry } from '../lib/games';
import { getPlayCount } from '../lib/history';
import { GameArt } from './GameArt';
import { Icon } from './Icon';

export function GameCard({ game }: { readonly game: GameEntry; readonly index?: number }) {
  const favorite = isFavorite(game.id);
  return (
    <article className="ml-game-card" style={{ '--game-soft': CATEGORIES[game.category].soft, '--game-accent': CATEGORIES[game.category].accent } as React.CSSProperties}>
      <Link to={`/game/${game.id}`} className="ml-card-link">
        <div className="ml-card-art">
          <GameArt gameId={game.id} category={game.category} fallback={game.icon} title="" className="h-14 w-14" />
        </div>
        <h3>{game.title}</h3>
        <p>{game.tagline}</p>
        <span className="ml-card-footer">
          {getPlayCount(game.id) ? 'Play again' : 'Try something new'} <Icon name="arrow" size={14} />
        </span>
      </Link>
      <button
        className={`ml-favorite ${favorite ? 'selected' : ''}`}
        aria-pressed={favorite}
        aria-label={`${favorite ? 'Remove' : 'Add'} ${game.title} ${favorite ? 'from' : 'to'} favorites`}
        onClick={() => toggleFavorite(game.id)}
      >
        <Icon name="star" size={18} filled={favorite} />
      </button>
    </article>
  );
}
