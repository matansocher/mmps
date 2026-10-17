import { EVENT_META, eventDetail, eventText, formatKickoff } from '../lib/format';
import { leagueColor } from '../lib/league-themes';
import type { Game, GameEvent, GameStats, Team } from '../types';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';

const MAX_CARD_EVENTS = 6;

function TeamRow({ team, game, isWinner }: { readonly team: Team; readonly game: Game; readonly isWinner: boolean }) {
  const showScore = game.status !== 'scheduled' && team.score !== null;
  const dim = game.status === 'finished' && !isWinner;
  return (
    <div className="flex items-center gap-2.5">
      <TeamLogo teamId={team.id} name={team.name} size={22} />
      <span className={`min-w-0 flex-1 truncate text-[15px] ${dim ? 'text-text-secondary' : 'font-semibold text-text-primary'}`}>{team.name}</span>
      {showScore && <span className={`score-font min-w-5 text-center text-lg ${dim ? 'text-text-secondary' : 'text-text-primary'}`}>{team.score}</span>}
    </div>
  );
}

function StatusBadge({ game }: { readonly game: Game }) {
  if (game.status === 'live') {
    return (
      <span className="flex items-center gap-1.5 rounded-md bg-accent-live/15 px-2 py-0.5 text-xs font-bold text-accent-live">
        <LiveDot />
        <span dir="ltr">{game.minuteDisplay || game.statusText || 'LIVE'}</span>
      </span>
    );
  }
  if (game.status === 'scheduled') return <span className="score-font rounded-md bg-bg-elevated px-2 py-0.5 text-xs text-text-primary">{formatKickoff(game.startTime)}</span>;
  return <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">{game.statusText || 'הסתיים'}</span>;
}

function EventLine({ event }: { readonly event: GameEvent }) {
  const meta = EVENT_META[event.type];
  const detail = eventDetail(event);
  const isHome = event.side === 'home';
  return (
    <li className={`flex items-center gap-1.5 text-xs ${isHome ? '' : 'flex-row-reverse text-left'}`}>
      <span className="score-font w-9 shrink-0 text-center text-[11px] text-text-muted" dir="ltr">
        {event.minuteDisplay}
      </span>
      <span className="shrink-0">{meta.icon}</span>
      <span className="min-w-0 truncate text-text-primary">
        {eventText(event)}
        {event.type === 'goal' && event.assistName && <span className="text-text-muted"> · {event.assistName}</span>}
        {detail && event.type !== 'substitution' && event.playerName && <span className="text-text-muted"> ({detail})</span>}
      </span>
    </li>
  );
}

function StatBar({ label, pair, highlightBar }: { readonly label: string; readonly pair: readonly [string, string]; readonly highlightBar?: boolean }) {
  const home = parseFloat(pair[0]) || 0;
  const away = parseFloat(pair[1]) || 0;
  const total = home + away;
  const homePct = total > 0 ? (home / total) * 100 : 50;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="score-font text-text-primary">{pair[0]}</span>
        <span className="text-text-muted">{label}</span>
        <span className="score-font text-text-primary">{pair[1]}</span>
      </div>
      {highlightBar && (
        <div className="flex h-1 overflow-hidden rounded-full bg-bg-elevated">
          <div className="bg-accent-brand" style={{ width: `${homePct}%` }} />
          <div className="flex-1 bg-text-muted/50" />
        </div>
      )}
    </div>
  );
}

function StatsStrip({ stats }: { readonly stats: GameStats }) {
  if (!stats.expectedGoals && !stats.shotsOnTarget && !stats.possession) return null;
  return (
    <div className="grid grid-cols-3 gap-3 border-t border-border-subtle pt-2">
      {stats.expectedGoals ? <StatBar label="xG" pair={stats.expectedGoals} /> : <span />}
      {stats.shotsOnTarget ? <StatBar label="למסגרת" pair={stats.shotsOnTarget} /> : <span />}
      {stats.possession ? <StatBar label="החזקה" pair={[stats.possession[0].replace('%', ''), stats.possession[1].replace('%', '')]} highlightBar /> : <span />}
    </div>
  );
}

export function GameCard({ game }: { readonly game: Game }) {
  const color = leagueColor(game.competitionId);
  const homeScore = game.home.score ?? 0;
  const awayScore = game.away.score ?? 0;
  const events = game.events.slice(-MAX_CARD_EVENTS);
  const hiddenEvents = game.events.length - events.length;
  return (
    <article className={`relative flex flex-col gap-2.5 overflow-hidden rounded-xl bg-bg-card p-3 ps-4 ${game.status === 'live' ? 'ring-1 ring-accent-live/30' : ''}`}>
      <span className="absolute inset-y-0 start-0 w-1" style={{ backgroundColor: color }} aria-hidden />
      <header className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] font-medium text-text-secondary">
          {game.isFavorite && <span className="me-1 text-accent-draw">★</span>}
          {game.competitionName}
        </span>
        <StatusBadge game={game} />
      </header>
      <div className="flex flex-col gap-1.5">
        <TeamRow team={game.home} game={game} isWinner={homeScore >= awayScore} />
        <TeamRow team={game.away} game={game} isWinner={awayScore >= homeScore} />
      </div>
      {events.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-border-subtle pt-2">
          {hiddenEvents > 0 && <li className="text-center text-[10px] text-text-muted">+{hiddenEvents} אירועים מוקדמים</li>}
          {events.map((event) => (
            <EventLine key={event.key} event={event} />
          ))}
        </ul>
      )}
      {game.status === 'live' && game.stats && <StatsStrip stats={game.stats} />}
    </article>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-xl bg-bg-card p-3">
      <div className="h-3 w-1/3 rounded bg-bg-elevated" />
      <div className="h-5 w-3/4 rounded bg-bg-elevated" />
      <div className="h-5 w-2/3 rounded bg-bg-elevated" />
    </div>
  );
}
