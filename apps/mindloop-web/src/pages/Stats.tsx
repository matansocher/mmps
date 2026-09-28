import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { useDataVersion } from '../hooks/useDataVersion';
import { getAchievements } from '../lib/achievements';
import { GAMES } from '../lib/games';
import { getHistory, getLongestStreak, getStreak, getTotalPlays, getWeeklyDays } from '../lib/history';
import { syncLabel } from '../lib/player-sync';
import { getProgress, readJson, scoreKey, writeJson } from '../lib/progress';

export function Stats() {
  useDataVersion();
  const achievements = getAchievements();
  const history = getHistory();
  const records = getProgress().records;
  const [selected, setSelected] = useState(() => history.find((r) => r.gameId !== 'warm-up')?.gameId ?? 'grid-recall');
  const [keepsake, setKeepsake] = useState(() => readJson('mindloop:keepsake', 'first-steps'));
  const latest = history.find((r) => r.gameId === selected && r.version === 2);
  const recent = latest
    ? history
        .filter((r) => scoreKey(r) === scoreKey(latest))
        .slice(0, 10)
        .reverse()
    : [];
  const max = Math.max(1, ...recent.map((r) => r.score));
  const avg = recent.length ? Math.round(recent.reduce((n, r) => n + r.score, 0) / recent.length) : 0;
  return (
    <main className="ml-page">
      <div className="ml-page-heading">
        <div>
          <p className="ml-eyebrow">A LITTLE MORE YOU</p>
          <h1>Your time well played.</h1>
          <p>A missed day never takes away what you’ve earned.</p>
        </div>
      </div>
      <div className="ml-summary-grid">
        {[
          [getTotalPlays(), 'Rounds completed'],
          [getStreak(), 'Current day streak'],
          [getLongestStreak(), 'Longest day streak'],
          [`${Math.min(3, getWeeklyDays())}/3`, 'Days this week'],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="ml-panel">
        <div className="ml-section-heading">
          <h2>Your own rhythm</h2>
          <label>
            <span className="sr-only">Game to chart</span>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {GAMES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        {recent.length ? (
          <>
            <p>
              Last {recent.length} rounds · {latest?.mode ?? 'classic'} · same rules and board
            </p>
            <div className="ml-trend" role="img" aria-label={`Recent scores, oldest to newest: ${recent.map((r) => r.score).join(', ')}. Average ${avg}.`}>
              {recent.map((r, i) => (
                <div key={r.runId}>
                  <span>{r.score}</span>
                  <i style={{ height: `${Math.max(4, (r.score / max) * 100)}px` }} />
                  <small>{i + 1}</small>
                </div>
              ))}
            </div>
            <p>
              Recent average <strong>{avg}</strong> · Personal best <strong>{records[scoreKey(latest!)] ?? 0}</strong>
            </p>
          </>
        ) : (
          <p>Finish a round to set your first score. New scoring records start here; your earlier play still counts toward lifetime progress.</p>
        )}
        <Link className="ml-text-button" to={`/game/${selected}`}>
          Play {GAMES.find((g) => g.id === selected)?.title}
          <Icon name="arrow" size={18} />
        </Link>
      </section>
      <section className="ml-section">
        <div className="ml-section-heading">
          <h2>Your little collection</h2>
          <span>
            {achievements.filter((a) => a.unlocked).length} of {achievements.length} keepsakes
          </span>
        </div>
        <p>Choose an earned keepsake to carry on your home screen.</p>
        <div className="ml-keepsakes">
          {achievements.map((a, i) => (
            <button
              key={a.id}
              disabled={!a.unlocked}
              aria-pressed={a.unlocked && keepsake === a.id}
              className={a.unlocked ? 'earned' : ''}
              onClick={() => {
                setKeepsake(a.id);
                writeJson('mindloop:keepsake', a.id);
              }}
            >
              <span className="ml-keepsake-art" style={{ transform: `rotate(${i * 35}deg)` }}>
                <Icon name="leaf" size={32} />
              </span>
              <strong>{a.title}</strong>
              <span>{a.description}</span>
              <small>{a.unlocked ? (keepsake === a.id ? 'Carrying this one' : 'Earned · yours to keep') : `${Math.round(a.progress * 100)}% of the way`}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="ml-section">
        <h2>Your games</h2>
        <div className="ml-game-records">
          {GAMES.map((g) => {
            const gameRecords = Object.entries(records).filter(([k]) => k.startsWith(`${g.id}:`) && k.includes(':2:'));
            return (
              <Link key={g.id} to={`/game/${g.id}`}>
                <GameArt gameId={g.id} category={g.category} fallback={g.icon} title="" className="h-10 w-10" />
                <span>
                  <strong>{g.title}</strong>
                  <small>
                    {gameRecords.length
                      ? gameRecords.map(([k, v]) => `${k.split(':')[1]}${k.split(':')[3] !== 'default' ? ` · ${k.split(':')[3]}` : ''}: ${v}`).join(' / ')
                      : 'Your first score is waiting'}
                  </small>
                </span>
                <Icon name="arrow" size={18} />
              </Link>
            );
          })}
        </div>
      </section>
      <p className="ml-save-note">{syncLabel()}</p>
    </main>
  );
}
