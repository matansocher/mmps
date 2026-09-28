import { Link } from 'react-router-dom';
import type { GameEntry } from '../lib/games';
import { getTodayPlayCount } from '../lib/history';
import { getHistory } from '../lib/history';
import { syncLabel } from '../lib/player-sync';
import type { RunRecord } from '../lib/progress';
import { localDay } from '../lib/progress';
import type { GameResult } from '../lib/types';
import { GameArt } from './GameArt';
import { Icon } from './Icon';
import { ReminderPrompt } from './ReminderPrompt';

export function ResultsScreen({
  game,
  result,
  best,
  previous,
  first,
  awards,
  onReplay,
  onNext,
  nextTitle,
  loop,
  run,
  onShare,
  newBest,
}: {
  readonly newBest: boolean;
  readonly game: GameEntry;
  readonly result: GameResult;
  readonly best: number;
  readonly previous: readonly RunRecord[];
  readonly first: boolean;
  readonly awards: readonly string[];
  readonly onReplay: () => void;
  readonly onNext: () => void;
  readonly nextTitle: string;
  readonly loop: boolean;
  readonly run: RunRecord;
  readonly onShare: () => void;
}) {
  const today = getHistory().filter((r) => r.day === localDay() && r.gameId !== 'warm-up');
  const tip: Record<string, string> = {
    'grid-recall': 'Try grouping the lit tiles into a simple shape.',
    'pair-match': 'Name each symbol as you turn it over.',
    'sequence-echo': 'Listen for the melody as well as the lights.',
    'sequence-track': 'Keep your eyes near the center and follow the marked dots.',
    'odd-one-out': 'Scan one row at a time. Shape spotting is available in Settings.',
    'quick-math': 'Start with the easy part of each expression.',
    raindrops: 'Clear the lowest drop first.',
    'flash-match': 'Check both the color and the shape.',
    'color-clash': 'Say the ink color quietly to yourself.',
    'rail-router': 'Set the next junction before the train arrives.',
    'ebb-flow': 'Read POINTS or MOVES before choosing a direction.',
    'block-escape': 'Make room for the blocker before moving your friend.',
    'order-up': 'Turn each order into a short story.',
    'shape-shift': 'Follow one distinctive corner as you rotate the shape.',
  };
  const done = getTodayPlayCount();
  const complete = done >= 3;
  const recent = previous.slice(0, 5);
  const average = recent.length ? Math.round(recent.reduce((a, b) => a + b.score, 0) / recent.length) : null;
  const headline = first ? 'Your first score is set.' : newBest ? 'A new personal best.' : 'Another little step forward.';
  return (
    <div className="ml-results">
      <div className="ml-results-art">
        <GameArt gameId={game.id} category={game.category} fallback={game.icon} title="" className="h-14 w-14" />
      </div>
      <p className="ml-eyebrow">{run.mode === 'practice' ? 'PRACTICE COMPLETE' : game.title}</p>
      <h1>{headline}</h1>
      <div className="ml-result-score">
        {result.score}
        <span>points · {run.mode === 'practice' ? 'practice record' : 'this run'}</span>
      </div>
      <div className="ml-result-stats">
        {result.stats?.map((stat) => (
          <div key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
      <p className="ml-result-insight">
        {average === null
          ? 'A starting point to build on. Your next round is a new chance.'
          : result.score >= average
            ? `${result.score - average} points above your recent average. Keep that rhythm.`
            : `Your recent average is ${average}. Every practice round helps you learn the game.`}{' '}
        <span>Best in this mode: {best}</span>
      </p>
      <p className="ml-result-tip">Next time: {tip[game.id]}</p>
      {awards.length > 0 && (
        <div className="ml-award-toast" role="status">
          <Icon name="spark" />
          <span>
            <strong>A new keepsake</strong>
            {awards.join(' · ')}
          </span>
        </div>
      )}
      <div className="ml-result-loop">
        <span>{complete ? 'Today’s loop complete' : `${Math.min(done, 3)} of 3 rounds today`}</span>
        <div>
          {[0, 1, 2].map((i) => (
            <i key={i} className={i < done ? 'done' : ''} />
          ))}
        </div>
        <p>
          {complete
            ? `You finished ${done} rounds today${today.length ? ` across ${new Set(today.map((r) => r.gameId)).size} games` : ''}. Tomorrow brings a fresh mix.`
            : 'Every finished round counts, including your favorites.'}
        </p>
      </div>
      {loop && !complete ? (
        <button className="ml-primary" onClick={onNext}>
          Next round · {nextTitle}
          <Icon name="arrow" />
        </button>
      ) : loop && complete ? (
        <Link className="ml-primary" to="/stats">
          See your progress
          <Icon name="arrow" />
        </Link>
      ) : (
        <button className="ml-primary" onClick={onReplay}>
          Play again
          <Icon name="play" size={18} />
        </button>
      )}
      <div className="ml-result-actions">
        {loop && (
          <button className="ml-text-button" onClick={onReplay}>
            Play again
          </button>
        )}
        <Link className="ml-text-button" to="/">
          Explore games
        </Link>
        {run.mode === 'daily' && (
          <button className="ml-text-button" onClick={onShare}>
            <Icon name="share" size={18} />
            Challenge a friend
          </button>
        )}
      </div>
      {complete && <ReminderPrompt />}
      <p className="ml-save-note">{syncLabel()}</p>
    </div>
  );
}
