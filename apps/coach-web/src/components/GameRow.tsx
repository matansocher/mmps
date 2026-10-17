import { EVENT_META, eventText, formatKickoff } from '../lib/format';
import { leagueColor } from '../lib/league-themes';
import type { Game, Side, Team } from '../types';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';

function redCards(game: Game, side: Side): number {
  return game.events.filter((e) => e.type === 'redCard' && e.side === side).length;
}

function TeamCell({ team, reds, align, dim }: { readonly team: Team; readonly reds: number; readonly align: 'start' | 'end'; readonly dim: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-1.5 ${align === 'end' ? 'flex-row-reverse' : ''}`}>
      <TeamLogo teamId={team.id} name={team.name} size={18} />
      <span className={`min-w-0 truncate text-[13px] ${dim ? 'text-text-secondary' : 'font-semibold'}`}>{team.shortName || team.name}</span>
      {reds > 0 && <span className="h-3 w-2 shrink-0 rounded-[2px] bg-accent-live" title={`${reds} אדומים`} />}
    </div>
  );
}

export function GameRow({ game }: { readonly game: Game }) {
  const homeScore = game.home.score ?? 0;
  const awayScore = game.away.score ?? 0;
  const finished = game.status === 'finished';
  const lastEvent = game.status === 'live' ? game.events.at(-1) : undefined;
  return (
    <article className="relative flex flex-col gap-1 overflow-hidden rounded-lg bg-bg-card py-2 ps-3 pe-2">
      <span className="absolute inset-y-0 start-0 w-0.5" style={{ backgroundColor: leagueColor(game.competitionId) }} aria-hidden />
      <div className="flex items-center gap-2">
        <div className="flex w-12 shrink-0 items-center justify-center">
          {game.status === 'live' ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-accent-live">
              <LiveDot />
              <span dir="ltr">{game.minuteDisplay || game.statusText}</span>
            </span>
          ) : game.status === 'scheduled' ? (
            <span className="score-font text-[11px] text-text-secondary">{formatKickoff(game.startTime)}</span>
          ) : (
            <span className="text-center text-[10px] leading-tight text-text-muted">{game.statusText}</span>
          )}
        </div>
        <TeamCell team={game.home} reds={redCards(game, 'home')} align="start" dim={finished && homeScore < awayScore} />
        <span className={`score-font w-12 shrink-0 text-center text-[15px] ${game.status === 'live' ? 'text-text-primary' : 'text-text-secondary'}`} dir="ltr">
          {game.status === 'scheduled' ? '–' : `${awayScore} - ${homeScore}`}
        </span>
        <TeamCell team={game.away} reds={redCards(game, 'away')} align="end" dim={finished && awayScore < homeScore} />
        {game.isFavorite && <span className="shrink-0 text-xs text-accent-draw">★</span>}
      </div>
      {lastEvent && (
        <p className="truncate ps-[56px] text-[11px] text-text-muted">
          <span dir="ltr">{lastEvent.minuteDisplay}</span> {EVENT_META[lastEvent.type].icon} {eventText(lastEvent)}
        </p>
      )}
    </article>
  );
}
