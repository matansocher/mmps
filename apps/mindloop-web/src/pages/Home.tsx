import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GameArt } from '../components/GameArt';
import { GameCard } from '../components/GameCard';
import { Icon } from '../components/Icon';
import { useDataVersion } from '../hooks/useDataVersion';
import { getAchievements } from '../lib/achievements';
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories';
import { getFavorites } from '../lib/favorites';
import { GAMES, getGame } from '../lib/games';
import { getHistory, getStreak, getTodayPlayCount, getTotalPlays, getWeeklyDays, todayKey } from '../lib/history';
import { syncLabel } from '../lib/player-sync';
import { DAILY_GOAL, localDay, readJson } from '../lib/progress';
import { dailyChallengeDay, dailySession, gameUrl } from '../lib/session';

export function Home() {
  useDataVersion();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const done = getTodayPlayCount();
  const complete = done >= DAILY_GOAL;
  const session = dailySession();
  const completed = getHistory()
    .filter((run) => (run.day ?? localDay(new Date(run.at))) === todayKey())
    .reverse();
  const next = getGame(session.games[Math.min(done, 2)])!;
  const favorites = getFavorites()
    .map(getGame)
    .filter((g) => !!g);
  const visible = GAMES.filter((g) => (category === 'all' || g.category === category) && `${g.title} ${g.tagline}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <main className="ml-page ml-home">
      <div className="ml-page-heading">
        <div>
          <p className="ml-eyebrow">YOUR DAILY MOMENT</p>
          <h1>{complete ? 'A little better, together.' : getTotalPlays() ? 'Good to see you.' : 'Make room for a little play.'}</h1>
          <p>Small challenges. Fresh discoveries. Your own pace.</p>
        </div>
        <span className="ml-streak">
          <Icon name="spark" size={18} /> {getStreak() ? `${getStreak()} day streak` : 'A fresh start'}
        </span>
      </div>
      <section className="ml-loop-card" aria-label="Today's loop">
        <div className="ml-loop-copy">
          <span className="ml-pill">
            <Icon name="leaf" size={16} /> TODAY’S LOOP
          </span>
          <h2>{complete ? 'You made time for you.' : 'Three rounds.\nOne good feeling.'}</h2>
          <p>{complete ? 'Your daily loop is complete. Come back for a fresh mix tomorrow, or explore a little more.' : 'A familiar favorite, a fresh challenge, and something to surprise you.'}</p>
          <div className="ml-loop-dots" aria-label={`${Math.min(done, 3)} of 3 rounds complete`}>
            {session.games.map((id, i) => (
              <span key={i} className={i < done ? 'done' : ''}>
                {i < done ? <Icon name="check" size={16} /> : i + 1}
                <span>{i < done ? (completed[i]?.gameId === 'warm-up' ? 'Warm-up' : (getGame(completed[i]?.gameId)?.title ?? 'Round complete')) : getGame(id)?.title}</span>
              </span>
            ))}
          </div>
          <Link className="ml-primary" to={complete ? '/stats' : gameUrl(next.id, 'classic', '&loop=1')}>
            {complete ? 'See your progress' : done ? `Continue · round ${done + 1} of 3` : 'Start today’s loop'}
            <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="ml-loop-art" aria-hidden="true">
          <div className="ml-orbit orbit-one" />
          <div className="ml-orbit orbit-two" />
          <div className="ml-art-center">
            <GameArt gameId={next.id} category={next.category} fallback={next.icon} title="" className="h-24 w-24" />
          </div>
          <span className="ml-art-caption">{complete ? 'Tomorrow, a fresh mix' : `Up next: ${next.title}`}</span>
        </div>
      </section>
      <div className="ml-home-extras">
        <Link className="ml-daily-card" to={gameUrl('block-escape', 'daily', `&day=${dailyChallengeDay()}`)}>
          <span className="ml-small-art">
            <GameArt gameId="block-escape" category="problem-solving" fallback="" title="" className="h-10 w-10" />
          </span>
          <span>
            <strong>One puzzle. Everyone’s invited.</strong>
            <small>Daily escape · take your time · challenge a friend</small>
          </span>
          <Icon name="arrow" />
        </Link>
        <div className="ml-week-card">
          <span className="ml-eyebrow">THIS WEEK</span>
          <strong>
            {Math.min(getWeeklyDays(), 3)} <small>/ 3 days of play</small>
          </strong>
          <p>Every visit counts. Missed a day? You’re still welcome.</p>
        </div>
      </div>
      {favorites.length > 0 && (
        <section className="ml-section">
          <div className="ml-section-heading">
            <h2>Your favorites</h2>
            <span>Always a good place to start</span>
          </div>
          <div className="ml-card-grid">
            {favorites.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}
      <section className="ml-section">
        <div className="ml-section-heading">
          <h2>Find your next favorite</h2>
          <label className="ml-search">
            <span className="sr-only">Search games</span>
            <input type="search" placeholder="Find a game…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
        <div className="ml-filter-row" aria-label="Game categories">
          {['all', ...CATEGORY_ORDER].map((id) => (
            <button key={id} aria-pressed={category === id} className={category === id ? 'active' : ''} onClick={() => setCategory(id)}>
              {id === 'all' ? 'All games' : CATEGORIES[id as keyof typeof CATEGORIES].label}
            </button>
          ))}
        </div>
        <div className="ml-card-grid">
          {visible.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
        {!visible.length && <p className="ml-empty">No matches yet. Try another name or category.</p>}
      </section>
      {getAchievements().find((a) => a.id === readJson('mindloop:keepsake', 'first-steps') && a.unlocked) && (
        <p className="ml-carried-keepsake">
          <Icon name="leaf" size={22} />
          {getAchievements().find((a) => a.id === readJson('mindloop:keepsake', 'first-steps'))?.title}
        </p>
      )}
      <footer className="ml-save-note">
        <Icon name="check" size={14} />
        {syncLabel()}
      </footer>
    </main>
  );
}
