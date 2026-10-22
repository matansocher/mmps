import { messages } from '../lib/i18n';
import { formatKickoff, formatLongDate } from '../lib/format';
import { leagueColor, teamColors } from '../lib/league-themes';
import { navigate } from '../lib/router';
import type { Game, Side, Team } from '../types';
import { scorerLines } from './GameCard';
import { Icon } from './Icon';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';

function TeamColumn({ team }: { readonly team: Team }) {
  return (
    <button onClick={() => navigate({ name: 'team', id: team.id })} className="group flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamLogo teamId={team.id} name={team.name} size={56} />
      <span className="flex items-center gap-0.5 text-team font-bold leading-tight group-hover:underline">
        <span className="line-clamp-2">{team.name}</span>
        <Icon name="back" size={14} className="shrink-0 -scale-x-100 text-text-muted rtl:scale-x-100" />
      </span>
    </button>
  );
}

// Scorers and red cards for one side, aligned under that team.
function SideEvents({ game, side }: { readonly game: Game; readonly side: Side }) {
  const events = game.events.filter((e) => e.side === side);
  const scorers = scorerLines(events);
  const reds = events.filter((e) => e.type === 'redCard');
  if (!scorers.length && !reds.length) return <div />;
  return (
    <ul className="flex min-w-0 flex-col items-center gap-0.5 text-caption text-text-secondary">
      {scorers.map((l) => (
        <li key={l.name} className="flex max-w-full items-center gap-1">
          <Icon name="ball" size={11} className="shrink-0 text-text-muted" />
          <span className="truncate">{l.name}</span>
          <span className="score-font ltr-num shrink-0 text-text-muted">{l.minutes.join(', ')}</span>
        </li>
      ))}
      {reds.map((e) => (
        <li key={e.key} className="flex max-w-full items-center gap-1">
          <Icon name="redCard" size={11} className="shrink-0" />
          <span className="truncate">{e.playerName ?? messages().events.redCard.title}</span>
          <span className="score-font ltr-num shrink-0 text-text-muted">{e.minuteDisplay}</span>
        </li>
      ))}
    </ul>
  );
}

export function Scoreboard({ game, halftimeScore }: { readonly game: Game; readonly halftimeScore?: readonly [number, number] }) {
  const hasScore = game.status !== 'scheduled' && game.home.score !== null;
  const colors = teamColors(game.home.color, game.away.color);
  const hasEvents = game.status !== 'scheduled' && game.events.some((e) => e.type === 'goal' || e.type === 'redCard');
  return (
    <div className="relative overflow-hidden rounded-2xl bg-bg-card">
      {/* Side tints: the home one sits at the inline start, so it's mirrored in RTL. */}
      <div className="pointer-events-none absolute inset-y-0 start-0 w-1/2 rtl:-scale-x-100" style={{ background: `linear-gradient(to right, ${colors.home}2e, transparent 80%)` }} aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 end-0 w-1/2 rtl:-scale-x-100" style={{ background: `linear-gradient(to left, ${colors.away}2e, transparent 80%)` }} aria-hidden />
      <div className="relative h-1" style={{ backgroundColor: leagueColor(game.competitionId) }} />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pt-5 pb-4">
        <TeamColumn team={game.home} />
        <div className="flex flex-col items-center gap-2 text-center">
          {hasScore ? (
            <span className="score-font ltr-num flex items-center text-display leading-none">
              {game.home.score}
              <span className="mx-1.5 -mt-1 text-text-muted">:</span>
              {game.away.score}
            </span>
          ) : (
            <span className="score-font text-score text-text-primary">{formatKickoff(game.startTime)}</span>
          )}
          {game.status === 'live' ? (
            <span className="flex items-center gap-1.5 rounded-full bg-accent-live/12 px-2.5 py-0.5 text-label font-bold text-accent-live">
              <LiveDot />
              <span className="ltr-num">{game.minuteDisplay || game.statusText || messages().common.live}</span>
            </span>
          ) : (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-caption font-semibold text-text-secondary">
              {game.status === 'scheduled' ? formatLongDate(game.startTime) : game.statusText}
            </span>
          )}
          {halftimeScore && <span className="score-font text-caption font-normal text-text-muted">{messages().game.halftime(halftimeScore[0], halftimeScore[1])}</span>}
        </div>
        <TeamColumn team={game.away} />
      </div>
      {hasEvents && (
        <div className="relative grid grid-cols-[1fr_auto_1fr] gap-3 border-t border-line px-4 py-3">
          <SideEvents game={game} side="home" />
          <span className="w-16" />
          <SideEvents game={game} side="away" />
        </div>
      )}
    </div>
  );
}
