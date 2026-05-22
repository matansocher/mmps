import type { MatchDto } from '../lib/types';

type Props = {
  match: MatchDto;
  onGuessClick: (match: MatchDto) => void;
};

export function MatchCard({ match, onGuessClick }: Props) {
  const isScheduled = match.status === 'scheduled';
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  const time = new Date(match.startTime).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    timeStyle: 'short',
  });

  function getPointsBadge() {
    if (!match.myGuess || match.myGuess.points === undefined) return null;
    const pts = match.myGuess.points;
    const color = pts === 5 ? 'bg-accent-exact' : pts === 3 ? 'bg-accent-gd' : pts === 1 ? 'bg-accent-result' : 'bg-accent-wrong';
    return <span className={`${color} text-black text-xs font-bold px-2 py-0.5 rounded-full`}>+{pts}</span>;
  }

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border-subtle">
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted text-xs">{match.stage}</span>
        <span className="text-text-muted text-xs">{time}</span>
      </div>

      {/* Teams + Score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 text-center">
          <div className="text-xl mb-0.5">{match.home.flag}</div>
          <div className="text-base font-semibold">{match.home.name}</div>
          {(isFinished || isLive) && <div className="score-font text-2xl mt-1">{match.home.score}</div>}
        </div>
        <div className="px-3">
          {isLive && <span className="text-accent-live text-xs font-bold animate-pulse">LIVE</span>}
          {isScheduled && <span className="text-text-muted text-lg">vs</span>}
          {isFinished && <span className="text-text-muted text-sm">FT</span>}
        </div>
        <div className="flex-1 text-center">
          <div className="text-xl mb-0.5">{match.away.flag}</div>
          <div className="text-base font-semibold">{match.away.name}</div>
          {(isFinished || isLive) && <div className="score-font text-2xl mt-1">{match.away.score}</div>}
        </div>
      </div>

      {/* Guess display */}
      {match.myGuess && (
        <div className="flex items-center justify-center gap-2 text-sm text-text-secondary mt-2">
          <span>🎯 {match.myGuess.away}-{match.myGuess.home}</span>
          {getPointsBadge()}
        </div>
      )}

      {/* Guess button for scheduled */}
      {isScheduled && (
        <button
          onClick={() => onGuessClick(match)}
          className="mt-3 w-full bg-accent-exact/15 text-accent-exact text-sm font-medium py-2 rounded-lg hover:bg-accent-exact/25 transition"
        >
          {match.myGuess ? '✏️ עריכת ניחוש' : '🎯 ניחוש'}
        </button>
      )}
    </div>
  );
}
