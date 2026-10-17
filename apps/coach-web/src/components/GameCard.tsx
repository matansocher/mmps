import { EVENT_META, eventText, formatKickoff } from '../lib/format';
import { leagueColor } from '../lib/league-themes';
import { navigate } from '../lib/router';
import { hapticSelect } from '../lib/telegram';
import type { Game, GameEvent, GameStats, Team } from '../types';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';

const MAX_SCORERS = 3;
const KEY_LINE_TYPES = new Set<GameEvent['type']>(['redCard', 'missedPenalty', 'var']);

type ScorerLine = { readonly name: string; readonly minutes: string[] };

// Goals grouped per player, in order of their first goal: "Saka 23', 67'".
function scorerLines(events: readonly GameEvent[]): ScorerLine[] {
  const byPlayer = new Map<string, ScorerLine>();
  for (const goal of events.filter((e) => e.type === 'goal')) {
    const ownGoal = /own/i.test(goal.detail ?? '');
    const name = `${goal.playerName ?? 'Goal'}${ownGoal ? ' (OG)' : ''}`;
    const line = byPlayer.get(name) ?? { name, minutes: [] };
    line.minutes.push(goal.minuteDisplay);
    byPlayer.set(name, line);
  }
  return [...byPlayer.values()];
}

function TeamRow({ team, game, isWinner }: { readonly team: Team; readonly game: Game; readonly isWinner: boolean }) {
  const showScore = game.status !== 'scheduled' && team.score !== null;
  const dim = game.status === 'finished' && !isWinner;
  const side = team.id === game.home.id ? 'home' : 'away';
  const yellows = game.events.filter((e) => e.side === side && e.type === 'yellowCard').length;
  return (
    <div className="flex items-center gap-2.5">
      <TeamLogo teamId={team.id} name={team.name} size={22} />
      <span className={`min-w-0 flex-1 truncate text-[15px] ${dim ? 'text-text-secondary' : 'font-semibold text-text-primary'}`}>{team.name}</span>
      {yellows > 0 && (
        <span className="score-font flex shrink-0 items-center gap-0.5 text-[10px] text-text-muted" title={`${yellows} yellow card${yellows > 1 ? 's' : ''}`}>
          <span className="inline-block h-2.5 w-[7px] rounded-[1px] bg-accent-draw" aria-hidden />
          {yellows}
        </span>
      )}
      {showScore && <span className={`score-font min-w-5 text-center text-lg ${dim ? 'text-text-secondary' : 'text-text-primary'}`}>{team.score}</span>}
    </div>
  );
}

// Fixed two-line block under each team (scorers, then red cards / missed penalties / VAR) so every card has the same height.
function KeyEvents({ game, side }: { readonly game: Game; readonly side: GameEvent['side'] }) {
  const events = game.events.filter((e) => e.side === side);
  const scorers = scorerLines(events);
  const shown = scorers.slice(0, MAX_SCORERS);
  const others = events.filter((e) => KEY_LINE_TYPES.has(e.type));
  return (
    <div className="flex h-8 flex-col justify-start ps-8 text-[11px] leading-4 text-text-secondary">
      {shown.length > 0 && (
        <p className="truncate" title={scorers.map((l) => `${l.name} ${l.minutes.join(', ')}`).join(' · ')}>
          <span aria-hidden>⚽ </span>
          {shown.map((l, i) => (
            <span key={l.name}>
              {i > 0 && <span className="text-text-muted"> · </span>}
              <span className="text-text-primary">{l.name}</span> <span className="score-font text-text-muted">{l.minutes.join(', ')}</span>
            </span>
          ))}
          {scorers.length > shown.length && <span className="text-text-muted"> +{scorers.length - shown.length} more</span>}
        </p>
      )}
      {others.length > 0 && (
        <p className="truncate">
          {others.map((e, i) => (
            <span key={e.key}>
              {i > 0 && <span className="text-text-muted"> · </span>}
              {EVENT_META[e.type].icon} <span className="text-text-primary">{eventText(e)}</span> <span className="score-font text-text-muted">{e.minuteDisplay}</span>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ game }: { readonly game: Game }) {
  if (game.status === 'live') {
    return (
      <span className="flex items-center gap-1.5 rounded-md bg-accent-live/15 px-2 py-0.5 text-xs font-bold text-accent-live">
        <LiveDot />
        <span>{game.minuteDisplay || game.statusText || 'LIVE'}</span>
      </span>
    );
  }
  if (game.status === 'scheduled') return <span className="score-font rounded-md bg-bg-elevated px-2 py-0.5 text-xs text-text-primary">{formatKickoff(game.startTime)}</span>;
  return <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">{game.statusText || 'FT'}</span>;
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
      {stats.shotsOnTarget ? <StatBar label="On target" pair={stats.shotsOnTarget} /> : <span />}
      {stats.possession ? <StatBar label="Possession" pair={[stats.possession[0].replace('%', ''), stats.possession[1].replace('%', '')]} highlightBar /> : <span />}
    </div>
  );
}

export function openGame(id: number) {
  hapticSelect();
  navigate({ name: 'game', id });
}

export function Channels({ channels, compact }: { readonly channels: readonly string[]; readonly compact?: boolean }) {
  return (
    <p className={`flex min-w-0 items-center gap-1 text-text-muted ${compact ? 'text-[10px]' : 'border-t border-border-subtle pt-2 text-[11px]'}`} title={channels.join(', ')}>
      <span aria-hidden>📺</span>
      <span className="truncate">{channels.join(' · ')}</span>
    </p>
  );
}

export function GameCard({ game }: { readonly game: Game }) {
  const color = leagueColor(game.competitionId);
  const homeScore = game.home.score ?? 0;
  const awayScore = game.away.score ?? 0;
  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => openGame(game.id)}
      onKeyDown={(e) => e.key === 'Enter' && openGame(game.id)}
      className={`relative flex cursor-pointer flex-col gap-2.5 overflow-hidden rounded-xl bg-bg-card p-3 ps-4 transition hover:bg-bg-elevated/60 ${game.status === 'live' ? 'ring-1 ring-accent-live/30' : ''}`}
    >
      <span className="absolute inset-y-0 start-0 w-1" style={{ backgroundColor: color }} aria-hidden />
      <header className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] font-medium text-text-secondary">
          {game.isFavorite && <span className="me-1 text-accent-draw">★</span>}
          {game.competitionName}
        </span>
        <StatusBadge game={game} />
      </header>
      {game.status === 'scheduled' ? (
        <div className="flex flex-col gap-1.5">
          <TeamRow team={game.home} game={game} isWinner />
          <TeamRow team={game.away} game={game} isWinner />
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <TeamRow team={game.home} game={game} isWinner={homeScore >= awayScore} />
          <KeyEvents game={game} side="home" />
          <TeamRow team={game.away} game={game} isWinner={awayScore >= homeScore} />
          <KeyEvents game={game} side="away" />
        </div>
      )}
      {/* Pinned to the bottom so stats and TV line up across a stretched grid row. */}
      <div className="mt-auto flex flex-col gap-2.5">
        {game.status === 'live' && game.stats && <StatsStrip stats={game.stats} />}
        {game.channels.length > 0 && <Channels channels={game.channels} />}
      </div>
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
