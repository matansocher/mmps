import { messages } from '../lib/i18n';
import { formatKickoff, formatLongDate } from '../lib/format';
import { leagueColor } from '../lib/league-themes';
import { navigate } from '../lib/router';
import type { Game, Team } from '../types';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';

function TeamColumn({ team }: { readonly team: Team }) {
  return (
    <button onClick={() => navigate({ name: 'team', id: team.id })} className="flex min-w-0 flex-col items-center gap-2 text-center transition hover:opacity-80">
      <TeamLogo teamId={team.id} name={team.name} size={56} />
      <span className="line-clamp-2 text-sm font-bold leading-tight">{team.name}</span>
    </button>
  );
}

export function Scoreboard({ game, halftimeScore }: { readonly game: Game; readonly halftimeScore?: readonly [number, number] }) {
  const hasScore = game.status !== 'scheduled' && game.home.score !== null;
  return (
    <div className="overflow-hidden rounded-2xl bg-bg-card">
      <div className="h-1.5" style={{ backgroundColor: leagueColor(game.competitionId) }} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-5">
        <TeamColumn team={game.home} />
        <div className="flex flex-col items-center gap-1.5 text-center">
          {hasScore ? (
            <span className="score-font flex items-center text-4xl leading-none">
              {game.home.score}
              <span className="mx-2 text-text-muted">-</span>
              {game.away.score}
            </span>
          ) : (
            <span className="score-font text-2xl text-text-secondary">{formatKickoff(game.startTime)}</span>
          )}
          {game.status === 'live' ? (
            <span className="flex items-center gap-1.5 text-sm font-bold text-accent-live">
              <LiveDot />
              <span className="ltr-num">{game.minuteDisplay || game.statusText || messages().common.live}</span>
            </span>
          ) : (
            <span className="text-xs text-text-secondary">{game.status === 'scheduled' ? formatLongDate(game.startTime) : game.statusText}</span>
          )}
          {halftimeScore && <span className="score-font text-[11px] font-normal text-text-muted">{messages().game.halftime(halftimeScore[0], halftimeScore[1])}</span>}
        </div>
        <TeamColumn team={game.away} />
      </div>
    </div>
  );
}
