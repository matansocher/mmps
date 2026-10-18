import { CARD_EVENT_TYPES, EVENT_META, eventText, formatKickoff } from '../lib/format';
import { useT } from '../lib/i18n';
import type { Game, Side, Team } from '../types';
import { openGame } from './GameCard';
import { Icon } from './Icon';
import { LiveDot } from './LiveDot';
import { GameHeadlineLine } from './GameHeadline';
import { TeamLogo } from './TeamLogo';
import { ScoreLine } from './ui';

function redCards(game: Game, side: Side): number {
  return game.events.filter((e) => e.type === 'redCard' && e.side === side).length;
}

function TeamCell({ team, reds, align, dim }: { readonly team: Team; readonly reds: number; readonly align: 'start' | 'end'; readonly dim: boolean }) {
  const t = useT();
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-1.5 ${align === 'end' ? 'flex-row-reverse' : ''}`}>
      <TeamLogo teamId={team.id} name={team.name} size={18} />
      <span className={`min-w-0 truncate text-[13px] ${dim ? 'text-text-secondary' : 'font-semibold'}`}>{team.shortName || team.name}</span>
      {reds > 0 && <span className="h-3 w-2 shrink-0 rounded-[2px] bg-accent-red" title={t.card.redCards(reds)} />}
    </div>
  );
}

function Center({ game }: { readonly game: Game }) {
  if (game.status === 'scheduled') {
    return <span className="score-font text-[13px] leading-5 text-text-secondary">{formatKickoff(game.startTime)}</span>;
  }
  return (
    <>
      <span className={`score-font text-base leading-5 ${game.status === 'live' ? 'text-text-primary' : 'text-text-secondary'}`}>
        <ScoreLine home={game.home.score ?? 0} away={game.away.score ?? 0} />
      </span>
      {game.status === 'live' ? (
        <span className="score-font flex h-3.5 items-center gap-1 text-[11px] font-bold leading-none text-accent-live">
          <LiveDot />
          <span className="ltr-num">{game.minuteDisplay || game.statusText}</span>
        </span>
      ) : (
        <span className="h-3.5 max-w-16 truncate text-[10px] leading-3.5 text-text-muted">{game.statusText}</span>
      )}
    </>
  );
}

export function GameRow({ game }: { readonly game: Game }) {
  const homeScore = game.home.score ?? 0;
  const awayScore = game.away.score ?? 0;
  const finished = game.status === 'finished';
  const lastEvent = game.status === 'live' ? game.events.filter((e) => CARD_EVENT_TYPES.has(e.type)).at(-1) : undefined;
  const t = useT();
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => openGame(game.id)}
      onKeyDown={(e) => e.key === 'Enter' && openGame(game.id)}
      className="relative flex cursor-pointer flex-col gap-1 rounded-xl border border-white/[0.06] bg-bg-card px-3 py-2 transition duration-150 ease-out hover:border-white/[0.1] hover:bg-[#161d27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brand"
    >
      {game.isFavorite && <Icon name="star" size={10} className="absolute end-1.5 top-1.5 text-accent-draw" title={t.common.favouriteTeam} />}
      <div className="flex items-center gap-2">
        <TeamCell team={game.home} reds={redCards(game, 'home')} align="start" dim={finished && homeScore < awayScore} />
        <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5">
          <Center game={game} />
        </div>
        <TeamCell team={game.away} reds={redCards(game, 'away')} align="end" dim={finished && awayScore < homeScore} />
      </div>
      {lastEvent && (
        <p className="flex min-w-0 items-center justify-center gap-1.5 text-[11px] text-text-muted">
          <span className="score-font ltr-num font-semibold text-text-secondary">{lastEvent.minuteDisplay}</span>
          <Icon name={EVENT_META[lastEvent.type].icon} size={11} />
          <span className="truncate text-text-secondary">{eventText(lastEvent)}</span>
        </p>
      )}
      {finished && game.headline && <GameHeadlineLine game={game} headline={game.headline} compact />}
    </div>
  );
}
