import { CARD_EVENT_TYPES, EVENT_META, eventText, formatKickoff } from '../lib/format';
import type { Game, Side, Team } from '../types';
import { openGame } from './GameCard';
import { Icon } from './Icon';
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
      {reds > 0 && <span className="h-3 w-2 shrink-0 rounded-[2px] bg-accent-red" title={`${reds} red card${reds > 1 ? 's' : ''}`} />}
    </div>
  );
}

export function GameRow({ game }: { readonly game: Game }) {
  const homeScore = game.home.score ?? 0;
  const awayScore = game.away.score ?? 0;
  const finished = game.status === 'finished';
  const lastEvent = game.status === 'live' ? game.events.filter((e) => CARD_EVENT_TYPES.has(e.type)).at(-1) : undefined;
  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => openGame(game.id)}
      onKeyDown={(e) => e.key === 'Enter' && openGame(game.id)}
      className="flex cursor-pointer flex-col gap-1 rounded-xl border border-white/[0.06] bg-bg-card px-2.5 py-2.5 transition duration-150 ease-out hover:border-white/[0.1] hover:bg-[#161d27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brand"
    >
      <div className="flex items-center gap-2">
        <div className="flex w-12 shrink-0 items-center justify-center">
          {game.status === 'live' ? (
            <span className="score-font flex items-center gap-1 text-[11px] font-bold text-accent-live">
              <LiveDot />
              <span>{game.minuteDisplay || game.statusText}</span>
            </span>
          ) : game.status === 'scheduled' ? (
            <span className="score-font text-[11px] text-text-secondary">{formatKickoff(game.startTime)}</span>
          ) : (
            <span className="text-center text-[10px] leading-tight text-text-muted">{game.statusText}</span>
          )}
        </div>
        <TeamCell team={game.home} reds={redCards(game, 'home')} align="start" dim={finished && homeScore < awayScore} />
        <span className={`score-font w-12 shrink-0 text-center text-base ${game.status === 'scheduled' ? 'text-text-muted' : game.status === 'live' ? 'text-text-primary' : 'text-text-secondary'}`}>
          {game.status === 'scheduled' ? '–' : `${homeScore} - ${awayScore}`}
        </span>
        <TeamCell team={game.away} reds={redCards(game, 'away')} align="end" dim={finished && awayScore < homeScore} />
        {game.isFavorite && <Icon name="star" size={12} className="text-accent-draw" title="Favourite team" />}
      </div>
      {lastEvent && (
        <p className="flex min-w-0 items-center gap-1.5 ps-[56px] text-[11px] text-text-muted">
          <span className="score-font font-semibold text-accent-live">{lastEvent.minuteDisplay}</span>
          <Icon name={EVENT_META[lastEvent.type].icon} size={11} />
          <span className="truncate text-text-secondary">{eventText(lastEvent)}</span>
        </p>
      )}
    </article>
  );
}
