import { useLocation } from 'wouter';
import type { MatchDto } from '../lib/types';
import { getTeamImageUrl } from '../data/player-images';

type Props = {
  match: MatchDto;
  onGuessClick: (match: MatchDto) => void;
};

function getStageLabel(stage: string | undefined): string {
  if (!stage) return '';
  // Group stage: "בית A סיבוב 1" → "בית A"
  const groupMatch = stage.match(/בית\s+([A-Z])/);
  if (groupMatch) return `בית ${groupMatch[1]}`;
  // Knockout rounds — return stage as-is (e.g. רבע גמר, חצי גמר)
  return stage;
}

function getTimeLabel(startTime: string): string {
  return new Date(startTime).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', timeStyle: 'short' });
}

export function MatchCard({ match, onGuessClick }: Props) {
  const [, navigate] = useLocation();
  const isScheduled = match.status === 'scheduled';
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  function getPointsBadge() {
    if (!match.myGuess || match.myGuess.points === undefined) return null;
    const pts = match.myGuess.points;
    const color = pts === 5 ? 'bg-accent-exact' : pts === 3 ? 'bg-accent-gd' : pts === 1 ? 'bg-accent-result' : 'bg-accent-wrong';
    return <span className={`${color} text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none`}>+{pts}</span>;
  }

  function handleCardClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    navigate(`/match/${match.id}`);
  }

  const stageLabel = getStageLabel(match.stage);

  return (
    <div className="bg-bg-card rounded-xl px-3 py-2.5 border border-border-subtle cursor-pointer hover:border-accent-exact/40 transition-colors" onClick={handleCardClick}>
      {/* Stage label */}
      <div className="text-center mb-1.5">
        <span className="text-text-muted text-[10px]">{stageLabel}</span>
      </div>

      {/* Main row: home — center — away */}
      <div className="flex items-center justify-between">
        {/* Home team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <img src={getTeamImageUrl(match.home.id, 24)} alt="" className="w-6 h-6 rounded-full shrink-0" />
          <span className="text-sm font-medium truncate">{match.home.name}</span>
        </div>

        {/* Center: score / time */}
        <div className="flex flex-col items-center px-2 shrink-0">
          {isScheduled && (
            <span className="text-text-secondary text-sm score-font">{getTimeLabel(match.startTime)}</span>
          )}
          {isLive && (
            <>
              <span className="score-font text-lg font-bold leading-none" dir="ltr">{match.home.score} - {match.away.score}</span>
              <span className="text-accent-live text-[10px] font-bold animate-pulse mt-0.5">{match.statusText || 'LIVE'}</span>
            </>
          )}
          {isFinished && (
            <>
              <span className="score-font text-lg font-bold leading-none" dir="ltr">{match.home.score} - {match.away.score}</span>
              <span className="text-text-muted text-[10px] mt-0.5">הסתיים</span>
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-sm font-medium truncate text-left">{match.away.name}</span>
          <img src={getTeamImageUrl(match.away.id, 24)} alt="" className="w-6 h-6 rounded-full shrink-0" />
        </div>
      </div>

      {/* Guess row */}
      {(match.myGuess || isScheduled) && (
        <div className="flex items-center justify-center gap-2 mt-1.5">
          {match.myGuess && (
            <div className="flex items-center gap-1 text-[11px] text-text-secondary">
              <span>🎯 {match.myGuess.away}-{match.myGuess.home}</span>
              {getPointsBadge()}
            </div>
          )}
          {isScheduled && (
            <button
              onClick={() => onGuessClick(match)}
              className="text-accent-exact text-[11px] font-medium hover:underline"
            >
              {match.myGuess ? '✏️' : '🎯 נחש'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="bg-bg-card rounded-xl px-3 py-2.5 border border-border-subtle animate-pulse">
      <div className="flex justify-center mb-1.5">
        <div className="h-3 w-12 bg-bg-elevated rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="w-6 h-6 rounded-full bg-bg-elevated" />
          <div className="h-4 w-16 bg-bg-elevated rounded" />
        </div>
        <div className="h-5 w-10 bg-bg-elevated rounded mx-2" />
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <div className="h-4 w-16 bg-bg-elevated rounded" />
          <div className="w-6 h-6 rounded-full bg-bg-elevated" />
        </div>
      </div>
    </div>
  );
}
