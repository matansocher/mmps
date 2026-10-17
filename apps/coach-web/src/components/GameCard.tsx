import { CARD_EVENT_TYPES, EVENT_META, eventText, formatKickoff } from '../lib/format';
import { navigate } from '../lib/router';
import { hapticSelect } from '../lib/telegram';
import type { Game, GameEvent, GameStats, Team, TvChannel } from '../types';
import { ChannelLogo } from './ChannelLogo';
import { CompetitionLogo } from './CompetitionLogo';
import { Icon } from './Icon';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';

const MAX_SCORERS = 3;
const REGULATION_MINUTES = 90;

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
  return (
    <div className="flex items-center gap-3">
      <TeamLogo teamId={team.id} name={team.name} size={24} />
      <span className={`min-w-0 flex-1 truncate text-[15px] tracking-[-0.01em] ${dim ? 'text-text-secondary' : 'font-semibold text-text-primary'}`}>{team.name}</span>
      {showScore && <span className={`score-font min-w-6 text-end text-[22px] leading-none tracking-[-0.02em] ${dim ? 'text-text-muted' : 'text-text-primary'}`}>{team.score}</span>}
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
    <div className="flex h-8 flex-col justify-start ps-9 text-[11px] leading-4 text-text-secondary">
      {shown.length > 0 && (
        <p className="flex min-w-0 items-center gap-1.5" title={scorers.map((l) => `${l.name} ${l.minutes.join(', ')}`).join(' · ')}>
          <Icon name="ball" size={11} className="text-text-muted" />
          <span className="truncate">
            {shown.map((l, i) => (
              <span key={l.name}>
                {i > 0 && <span className="text-text-muted"> · </span>}
                <span className="text-text-primary/90">{l.name}</span> <span className="score-font font-medium text-text-muted">{l.minutes.join(', ')}</span>
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
                <span className="text-text-primary/90">{eventText(e)}</span> <span className="score-font font-medium text-text-muted">{e.minuteDisplay}</span>
              </span>
            ))}
          </span>
        </p>
      )}
    </div>
  );
}

function StatusBadge({ game }: { readonly game: Game }) {
  if (game.status === 'live') {
    return (
      <span className="flex h-6 items-center gap-1.5 rounded-full bg-accent-live/12 px-2.5 text-xs font-bold text-accent-live">
        <LiveDot />
        <span className="score-font">{game.minuteDisplay || game.statusText || 'LIVE'}</span>
      </span>
    );
  }
  if (game.status === 'scheduled') return <span className="score-font flex h-6 items-center rounded-full bg-white/[0.06] px-2.5 text-xs text-text-primary">{formatKickoff(game.startTime)}</span>;
  return <span className="flex h-6 items-center rounded-full px-1 text-xs font-semibold tracking-wide text-text-muted">{game.statusText || 'FT'}</span>;
}

function StatColumn({ label, pair }: { readonly label: string; readonly pair: readonly [string, string] }) {
  const home = parseFloat(pair[0]) || 0;
  const away = parseFloat(pair[1]) || 0;
  const total = home + away;
  const homePct = total > 0 ? (home / total) * 100 : 50;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-1 text-xs">
        <span className={`score-font ${home >= away ? 'text-text-primary' : 'text-text-secondary'}`}>{pair[0]}</span>
        <span className="truncate text-[11px] text-text-muted">{label}</span>
        <span className={`score-font ${away >= home ? 'text-text-primary' : 'text-text-secondary'}`}>{pair[1]}</span>
      </div>
      <div className="flex h-[3px] gap-0.5">
        <div className="rounded-full bg-text-primary/70 transition-[width] duration-500 ease-out" style={{ width: `${homePct}%` }} />
        <div className="flex-1 rounded-full bg-white/[0.12]" />
      </div>
    </div>
  );
}

function StatsStrip({ stats }: { readonly stats: GameStats }) {
  if (!stats.expectedGoals && !stats.shotsOnTarget && !stats.possession) return null;
  return (
    <div className="grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-3">
      {stats.expectedGoals ? <StatColumn label="xG" pair={stats.expectedGoals} /> : <span />}
      {stats.shotsOnTarget ? <StatColumn label="On target" pair={stats.shotsOnTarget} /> : <span />}
      {stats.possession ? <StatColumn label="Poss." pair={[stats.possession[0].replace('%', ''), stats.possession[1].replace('%', '')]} /> : <span />}
    </div>
  );
}

export function openGame(id: number) {
  hapticSelect();
  navigate({ name: 'game', id });
}

function HeaderChannel({ channels }: { readonly channels: readonly TvChannel[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1" title={channels.map((c) => c.name).join(', ')}>
      <ChannelLogo channel={channels[0]} height={14} />
      {channels.length > 1 && <span className="text-[10px] font-medium text-text-muted">+{channels.length - 1}</span>}
    </span>
  );
}

function matchProgress(game: Game): number | null {
  if (game.status !== 'live') return null;
  const minute = parseInt(game.minuteDisplay ?? '', 10);
  if (!Number.isFinite(minute)) return null;
  return Math.min(100, (minute / REGULATION_MINUTES) * 100);
}

export function GameCard({ game }: { readonly game: Game }) {
  const homeScore = game.home.score ?? 0;
  const awayScore = game.away.score ?? 0;
  const progress = matchProgress(game);
  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => openGame(game.id)}
      onKeyDown={(e) => e.key === 'Enter' && openGame(game.id)}
      className="group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition duration-200 ease-out hover:-translate-y-px hover:border-white/[0.1] hover:bg-[#161d27] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brand active:translate-y-0"
    >
      {progress !== null && (
        <span className="absolute inset-x-0 top-0 h-[2px] bg-white/[0.04]" aria-hidden>
          <span className="block h-full bg-accent-live/70 transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
        </span>
      )}
      <header className="flex h-6 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-text-secondary">
          <CompetitionLogo competitionId={game.competitionId} size={16} />
          <span className="truncate">{game.competitionName}</span>
          {game.isFavorite && <Icon name="star" size={12} className="text-accent-draw" title="Favourite team" />}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {game.channels.length > 0 && <HeaderChannel channels={game.channels} />}
          <StatusBadge game={game} />
        </span>
      </header>
      {game.status === 'scheduled' ? (
        <div className="flex flex-col gap-2.5 py-1">
          <TeamRow team={game.home} game={game} isWinner />
          <TeamRow team={game.away} game={game} isWinner />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <TeamRow team={game.home} game={game} isWinner={homeScore >= awayScore} />
          <KeyEvents game={game} side="home" />
          <TeamRow team={game.away} game={game} isWinner={awayScore >= homeScore} />
          <KeyEvents game={game} side="away" />
        </div>
      )}
      {/* Pinned to the bottom so stats line up across a stretched grid row. */}
      {game.status === 'live' && game.stats && (
        <div className="mt-auto">
          <StatsStrip stats={game.stats} />
        </div>
      )}
    </article>
  );
}

function SkeletonTeam() {
  return (
    <div className="flex items-center gap-3">
      <div className="size-6 rounded-full bg-white/[0.06]" />
      <div className="h-3.5 w-1/2 rounded-full bg-white/[0.06]" />
      <div className="ms-auto h-5 w-4 rounded bg-white/[0.06]" />
    </div>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-2xl border border-white/[0.06] bg-bg-card p-4" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="h-3 w-1/3 rounded-full bg-white/[0.06]" />
        <div className="h-6 w-12 rounded-full bg-white/[0.06]" />
      </div>
      <SkeletonTeam />
      <SkeletonTeam />
    </div>
  );
}
