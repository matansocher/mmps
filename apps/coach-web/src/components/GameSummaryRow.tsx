import { formatKickoff, formatShortDate } from '../lib/format';
import { navigate } from '../lib/router';
import type { GameSummary, NamedValue } from '../types';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';
import { FormBadge } from './ui';

export function GameSummaryRow({ game, stats }: { readonly game: GameSummary; readonly stats?: readonly NamedValue[] }) {
  const hasScore = game.status !== 'scheduled' && game.home.score !== null;
  return (
    <button onClick={() => navigate({ name: 'game', id: game.id })} className="flex w-full flex-col gap-1.5 px-3 py-2.5 text-start transition hover:bg-bg-elevated/60">
      <span className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
        <span className="truncate">{game.competitionName}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {game.status === 'live' && (
            <>
              <LiveDot />
              <span className="font-bold text-accent-live">Live</span>
            </>
          )}
          {formatShortDate(game.startTime)}
          {game.status === 'scheduled' && ` · ${formatKickoff(game.startTime)}`}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-sm">{game.home.shortName || game.home.name}</span>
          <TeamLogo teamId={game.home.id} name={game.home.name} size={20} />
        </span>
        <span className={`score-font w-14 shrink-0 text-center ${game.status === 'live' ? 'text-accent-live' : ''}`}>{hasScore ? `${game.home.score} - ${game.away.score}` : 'vs'}</span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <TeamLogo teamId={game.away.id} name={game.away.name} size={20} />
          <span className="truncate text-sm">{game.away.shortName || game.away.name}</span>
        </span>
        <span className="flex w-5 shrink-0 justify-end">{game.result && <FormBadge result={game.result} />}</span>
      </span>
      {stats && stats.length > 0 && (
        <span className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px] text-text-secondary">
          {stats.map((s) => (
            <span key={s.name}>
              {s.name} <span className="score-font text-text-primary">{s.value}</span>
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
