import { CARD_EVENT_TYPES, EVENT_META, eventText, formatKickoff } from '../lib/format';
import { messages, useT } from '../lib/i18n';
import { navigate } from '../lib/router';
import { hapticSelect } from '../lib/telegram';
import type { DashboardStandingRow, FormEntry, Game, GameEvent, Team } from '../types';
import { HotBadge, PreMatchButton } from './CardActions';
import { ChannelBadge } from './ChannelBadge';
import { CompetitionLogo } from './CompetitionLogo';
import { GameHeadlineLine } from './GameHeadline';
import { Icon } from './Icon';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';
import { FormBadge } from './ui';

const MAX_SCORERS = 3;
const REGULATION_MINUTES = 90;
const EXTRA_TIME_MINUTES = 120;

type ScorerLine = { readonly name: string; readonly minutes: string[] };

// Goals grouped per player, in order of their first goal: "Saka 23', 67'".
function scorerLines(events: readonly GameEvent[]): ScorerLine[] {
  const byPlayer = new Map<string, ScorerLine>();
  for (const goal of events.filter((e) => e.type === 'goal')) {
    const t = messages();
    const name = `${goal.playerName ?? t.events.goal.title}${goal.ownGoal ? ` (${t.ownGoalShort})` : ''}`;
    const line = byPlayer.get(name) ?? { name, minutes: [] };
    line.minutes.push(goal.minuteDisplay);
    byPlayer.set(name, line);
  }
  return [...byPlayer.values()];
}

export function WinProbability({ team, status }: { readonly team: Team; readonly status: Game['status'] }) {
  const t = useT().card;
  if ((status !== 'scheduled' && status !== 'live') || team.winProbability === undefined) return null;
  const percent = Math.round(team.winProbability);
  const label = t.winProbability(team.name, percent);
  return (
    <span className="score-font shrink-0 text-caption font-normal text-text-secondary" title={label} aria-label={label} dir="ltr">
      {t.winPercentage(percent)}
    </span>
  );
}

function TeamRow({ team, game, isWinner, form }: { readonly team: Team; readonly game: Game; readonly isWinner: boolean; readonly form?: readonly FormEntry[] }) {
  const showScore = game.status !== 'scheduled' && team.score !== null;
  const dim = game.status === 'finished' && !isWinner;
  return (
    <div className="flex items-center gap-3">
      <TeamLogo teamId={team.id} name={team.name} size={24} />
      <span className="flex min-w-0 flex-1 items-baseline gap-1">
        <span className={`min-w-0 truncate text-team tracking-[-0.01em] ${dim ? 'text-text-secondary' : 'font-semibold text-text-primary'}`}>{team.name}</span>
        <WinProbability team={team} status={game.status} />
      </span>
      {form && form.length > 0 && <FormPills entries={form} />}
      {showScore && <span className={`score-font min-w-6 text-end text-score leading-none tracking-[-0.02em] ${dim ? 'text-text-muted' : 'text-text-primary'}`}>{team.score}</span>}
    </div>
  );
}

// Fixed two-line block under each team (scorers, then red cards / missed penalties / VAR) so every card has the same height.
function KeyEvents({ game, side }: { readonly game: Game; readonly side: GameEvent['side'] }) {
  const events = game.events.filter((e) => e.side === side);
  const scorers = scorerLines(events);
  const shown = scorers.slice(0, MAX_SCORERS);
  const others = events.filter((e) => e.type !== 'goal' && CARD_EVENT_TYPES.has(e.type));
  return (
    <div className="flex h-8 flex-col justify-start ps-9 text-caption leading-4 text-text-secondary">
      {shown.length > 0 && (
        <p className="flex min-w-0 items-center gap-1.5" title={scorers.map((l) => `${l.name} ${l.minutes.join(', ')}`).join(' · ')}>
          <Icon name="ball" size={11} className="text-text-muted" />
          <span className="truncate">
            {shown.map((l, i) => (
              <span key={l.name}>
                {i > 0 && <span className="text-text-muted"> · </span>}
                <span className="text-text-primary/90">{l.name}</span> <span className="score-font ltr-num font-medium text-text-secondary">{l.minutes.join(', ')}</span>
              </span>
            ))}
            {scorers.length > shown.length && <span className="text-text-muted"> +{scorers.length - shown.length}</span>}
          </span>
        </p>
      )}
      {others.length > 0 && (
        <p className="flex min-w-0 items-center gap-1.5">
          <Icon name={EVENT_META[others[0].type].icon} size={11} className="text-text-muted" />
          <span className="truncate">
            {others.map((e, i) => (
              <span key={e.key}>
                {i > 0 && (
                  <>
                    <span className="text-text-muted"> · </span>
                    <Icon name={EVENT_META[e.type].icon} size={11} className="-mt-px me-1 align-middle text-text-muted" />
                  </>
                )}
                <span className="text-text-primary/90">{eventText(e)}</span> <span className="score-font ltr-num font-medium text-text-secondary">{e.minuteDisplay}</span>
              </span>
            ))}
          </span>
        </p>
      )}
    </div>
  );
}

function StatusBadge({ game }: { readonly game: Game }) {
  const t = useT();
  if (game.status === 'live') {
    return (
      <span className="flex h-6 items-center gap-1.5 rounded-full bg-accent-live/12 px-2.5 text-xs font-bold text-accent-live">
        <LiveDot />
        <span className="live-minute score-font ltr-num">{game.minuteDisplay || game.statusText || t.common.live}</span>
      </span>
    );
  }
  if (game.status === 'scheduled') return <span className="score-font flex h-6 items-center rounded-full bg-surface-2 px-2.5 text-xs text-text-primary">{formatKickoff(game.startTime)}</span>;
  return <span className="flex h-6 items-center rounded-full px-1 text-xs font-semibold tracking-wide text-text-secondary">{game.statusText || t.card.fullTime}</span>;
}

function liveMinute(game: Game): number {
  if (game.minute != null) return game.minute;
  const minute = parseInt(game.minuteDisplay ?? '', 10);
  return Number.isFinite(minute) ? minute : 0;
}

function TimelineLane({ events, scale, side }: { readonly events: readonly GameEvent[]; readonly scale: number; readonly side: 'top' | 'bottom' }) {
  return (
    <div className="relative h-3">
      {events.map((e) => (
        <span
          key={e.key}
          title={`${e.minuteDisplay} ${eventText(e)}`}
          className={`absolute -translate-x-1/2 rtl:translate-x-1/2 ${side === 'top' ? 'bottom-0' : 'top-0'} ${e.type === 'goal' ? 'text-text-primary' : 'text-text-secondary'}`}
          style={{ insetInlineStart: `${Math.min(100, (e.minute / scale) * 100)}%` }}
        >
          <Icon name={EVENT_META[e.type].icon} size={11} />
        </span>
      ))}
    </div>
  );
}

// 0–90' track: played part in green, home events above, away events below.
function MatchTimeline({ game }: { readonly game: Game }) {
  const minute = liveMinute(game);
  const events = game.events.filter((e) => CARD_EVENT_TYPES.has(e.type));
  const latest = Math.max(minute, ...events.map((e) => e.minute));
  const scale = latest > 105 ? EXTRA_TIME_MINUTES : REGULATION_MINUTES;
  const played = Math.min(100, (minute / scale) * 100);
  const t = useT();
  return (
    <div className="grid grid-cols-[14px_1fr] items-center gap-x-2.5 border-t border-line pt-3" aria-label={t.card.timeline(game.minuteDisplay || game.statusText)}>
      <TeamLogo teamId={game.home.id} name={game.home.name} size={14} />
      <TimelineLane events={events.filter((e) => e.side === 'home')} scale={scale} side="top" />
      <span />
      <div className="relative my-1 h-[3px] rounded-full bg-surface-3">
        <div className="live-progress h-full rounded-full bg-accent-live/70 transition-[width] duration-700 ease-out" style={{ width: `${played}%` }} />
        <span className="absolute -top-[2px] h-[7px] w-px bg-white/25" style={{ insetInlineStart: `${(45 / scale) * 100}%` }} aria-hidden />
      </div>
      <TeamLogo teamId={game.away.id} name={game.away.name} size={14} />
      <TimelineLane events={events.filter((e) => e.side === 'away')} scale={scale} side="bottom" />
    </div>
  );
}

function FormPills({ entries }: { readonly entries: readonly FormEntry[] }) {
  const t = useT();
  return (
    <div className="flex shrink-0 gap-1" role="group" aria-label={t.common.form}>
      {entries.map((entry, i) => (
        <span key={i} title={t.formTitle(entry.result, entry.score, entry.opponent)}>
          <FormBadge result={entry.result} />
        </span>
      ))}
    </div>
  );
}

function StandingLine({ team, row }: { readonly team: Team; readonly row: DashboardStandingRow }) {
  return (
    <>
      <span role="cell" className="flex items-center gap-1.5">
        <span className="h-3 w-[3px] rounded-full" style={{ backgroundColor: row.zoneColor ?? 'transparent' }} aria-hidden />
        <span className="score-font w-4 text-center text-text-primary">{row.position}</span>
      </span>
      <span role="cell" className="flex min-w-0 items-center gap-1.5">
        <TeamLogo teamId={team.id} name={team.name} size={14} />
        <span className="truncate text-text-secondary">{team.shortName || team.name}</span>
      </span>
      <span role="cell" className="score-font text-center text-text-secondary">{row.played}</span>
      <span role="cell" className="score-font ltr-num text-center text-text-secondary">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</span>
      <span role="cell" className="score-font text-center text-text-primary">{row.points}</span>
    </>
  );
}

// Both teams' rows from the league table, ordered by position.
export function StandingsSnippet({ game }: { readonly game: Game }) {
  const t = useT().standings;
  if (!game.standings) return null;
  const rows = [
    { team: game.home, row: game.standings.home },
    { team: game.away, row: game.standings.away },
  ].sort((a, b) => a.row.position - b.row.position);
  return (
    <div role="table" aria-label={t.title} className="grid grid-cols-[auto_minmax(0,1fr)_2rem_2.5rem_2rem] items-center gap-x-2 gap-y-1.5 border-t border-line pt-3 text-caption">
      <span role="row" className="contents text-caption font-medium text-text-secondary">
        <span role="columnheader" className="text-center">
          #
        </span>
        <span role="columnheader">{t.team}</span>
        <span role="columnheader" className="text-center">
          {t.played}
        </span>
        <span role="columnheader" className="text-center">
          {t.goalDiff}
        </span>
        <span role="columnheader" className="text-center">
          {t.points}
        </span>
      </span>
      {rows.map(({ team, row }) => (
        <span role="row" key={team.id} className="contents">
          <StandingLine team={team} row={row} />
        </span>
      ))}
    </div>
  );
}

export function openGame(id: number) {
  hapticSelect();
  navigate({ name: 'game', id });
}

function GameFooter({ game }: { readonly game: Game }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
      <div className="flex min-w-0 flex-1">
        <ChannelBadge channels={game.channels} />
      </div>
      <StatusBadge game={game} />
    </div>
  );
}

export function GameCard({ game }: { readonly game: Game }) {
  const homeScore = game.home.score ?? 0;
  const awayScore = game.away.score ?? 0;
  const t = useT();
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => openGame(game.id)}
      onKeyDown={(e) => e.key === 'Enter' && openGame(game.id)}
      className="game-card group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition duration-200 ease-out hover:-translate-y-px hover:border-line-strong hover:bg-[#161d27] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brand active:translate-y-0"
    >
      <div className="flex h-6 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-text-secondary">
          <CompetitionLogo competitionId={game.competitionId} size={16} />
          <span className="truncate">{game.competitionName}</span>
          {game.isFavorite && <Icon name="star" size={12} className="text-accent-fav" title={t.common.favouriteTeam} />}
        </span>
        <span className="flex min-w-0 items-center justify-end gap-2">
          {game.status === 'live' && <ChannelBadge channels={game.channels} />}
          <HotBadge game={game} />
          {game.status !== 'scheduled' && <StatusBadge game={game} />}
          <span className="-me-1.5 flex items-center empty:hidden">
            <PreMatchButton game={game} />
          </span>
        </span>
      </div>
      {game.status === 'scheduled' ? (
        <div className="flex flex-col gap-2.5 py-1">
          <TeamRow team={game.home} game={game} isWinner form={game.form?.home} />
          <TeamRow team={game.away} game={game} isWinner form={game.form?.away} />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <TeamRow team={game.home} game={game} isWinner={homeScore >= awayScore} />
          <KeyEvents game={game} side="home" />
          <TeamRow team={game.away} game={game} isWinner={awayScore >= homeScore} />
          <KeyEvents game={game} side="away" />
        </div>
      )}
      {game.status === 'live' && (
        <div className="mt-auto">
          <MatchTimeline game={game} />
        </div>
      )}
      {game.status === 'scheduled' && (
        <div className="mt-auto">
          <GameFooter game={game} />
        </div>
      )}
      {game.status === 'finished' && game.headline && (
        <div className="mt-auto">
          <GameHeadlineLine game={game} headline={game.headline} />
        </div>
      )}
    </div>
  );
}

function SkeletonTeam() {
  return (
    <div className="flex items-center gap-3">
      <div className="size-6 rounded-full bg-surface-2" />
      <div className="h-3.5 w-1/2 rounded-full bg-surface-2" />
      <div className="ms-auto h-5 w-4 rounded bg-surface-2" />
    </div>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-2xl border border-line bg-bg-card p-4" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="h-3 w-1/3 rounded-full bg-surface-2" />
        <div className="h-6 w-12 rounded-full bg-surface-2" />
      </div>
      <SkeletonTeam />
      <SkeletonTeam />
    </div>
  );
}
