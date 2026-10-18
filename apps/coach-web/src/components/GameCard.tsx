import { useNow } from '../hooks/useNow';
import { CARD_EVENT_TYPES, EVENT_META, eventText, formatKickoff } from '../lib/format';
import { messages, useT } from '../lib/i18n';
import { navigate } from '../lib/router';
import { hapticSelect } from '../lib/telegram';
import type { FormEntry, Game, GameEvent, Team, TvChannel } from '../types';
import { ChannelLogo } from './ChannelLogo';
import { CompetitionLogo } from './CompetitionLogo';
import { GameHeadlineLine } from './GameHeadline';
import { Icon } from './Icon';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';
import { FormBadge } from './ui';

const MAX_SCORERS = 3;
const REGULATION_MINUTES = 90;
const EXTRA_TIME_MINUTES = 120;
const COUNTDOWN_WINDOW_MS = 24 * 60 * 60_000;

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
                <span className="text-text-primary/90">{l.name}</span> <span className="score-font ltr-num font-medium text-text-muted">{l.minutes.join(', ')}</span>
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
                <span className="text-text-primary/90">{eventText(e)}</span> <span className="score-font ltr-num font-medium text-text-muted">{e.minuteDisplay}</span>
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
        <span className="score-font ltr-num">{game.minuteDisplay || game.statusText || t.common.live}</span>
      </span>
    );
  }
  if (game.status === 'scheduled') return <span className="score-font flex h-6 items-center rounded-full bg-white/[0.06] px-2.5 text-xs text-text-primary">{formatKickoff(game.startTime)}</span>;
  return <span className="flex h-6 items-center rounded-full px-1 text-xs font-semibold tracking-wide text-text-muted">{game.statusText || t.card.fullTime}</span>;
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
    <div className="grid grid-cols-[14px_1fr] items-center gap-x-2.5 border-t border-white/[0.06] pt-3" aria-label={t.card.timeline(game.minuteDisplay || game.statusText)}>
      <TeamLogo teamId={game.home.id} name={game.home.name} size={14} />
      <TimelineLane events={events.filter((e) => e.side === 'home')} scale={scale} side="top" />
      <span />
      <div className="relative my-1 h-[3px] rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full bg-accent-live/70 transition-[width] duration-700 ease-out" style={{ width: `${played}%` }} />
        <span className="absolute -top-[2px] h-[7px] w-px bg-white/25" style={{ insetInlineStart: `${(45 / scale) * 100}%` }} aria-hidden />
      </div>
      <TeamLogo teamId={game.away.id} name={game.away.name} size={14} />
      <TimelineLane events={events.filter((e) => e.side === 'away')} scale={scale} side="bottom" />
    </div>
  );
}

function FormPills({ entries, align }: { readonly entries: readonly FormEntry[]; readonly align: 'start' | 'end' }) {
  const t = useT();
  if (entries.length === 0) return <span className={`text-xs text-text-muted ${align === 'end' ? 'text-end' : ''}`}>—</span>;
  return (
    <div className={`flex gap-1 ${align === 'end' ? 'justify-end' : ''}`}>
      {entries.map((entry, i) => (
        <span key={i} title={t.formTitle(entry.result, entry.score, entry.opponent)}>
          <FormBadge result={entry.result} />
        </span>
      ))}
    </div>
  );
}

function FormStrip({ game }: { readonly game: Game }) {
  const t = useT();
  if (!game.form || (game.form.home.length === 0 && game.form.away.length === 0)) return null;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-white/[0.06] pt-3">
      <FormPills entries={game.form.home} align="start" />
      <span className="text-[11px] text-text-muted">{t.common.form}</span>
      <FormPills entries={game.form.away} align="end" />
    </div>
  );
}

function formatCountdown(ms: number): string | null {
  if (ms <= 0 || ms > COUNTDOWN_WINDOW_MS) return null;
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return messages().card.countdown(hours, minutes);
}

function Countdown({ startTime }: { readonly startTime: string }) {
  const now = useNow(60_000);
  const text = formatCountdown(new Date(startTime).getTime() - now);
  return text ? <span className="score-font text-[11px] text-text-muted">{text}</span> : null;
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
      className="group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition duration-200 ease-out hover:-translate-y-px hover:border-white/[0.1] hover:bg-[#161d27] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brand active:translate-y-0"
    >
      <div className="flex h-6 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-text-secondary">
          <CompetitionLogo competitionId={game.competitionId} size={16} />
          <span className="truncate">{game.competitionName}</span>
          {game.isFavorite && <Icon name="star" size={12} className="text-accent-draw" title={t.common.favouriteTeam} />}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {game.channels.length > 0 && <HeaderChannel channels={game.channels} />}
          {game.status === 'scheduled' && <Countdown startTime={game.startTime} />}
          <StatusBadge game={game} />
        </span>
      </div>
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
      {/* Pinned to the bottom so it lines up across a stretched grid row. */}
      {game.status === 'live' && (
        <div className="mt-auto">
          <MatchTimeline game={game} />
        </div>
      )}
      {game.status === 'finished' && game.headline && (
        <div className="mt-auto">
          <GameHeadlineLine game={game} headline={game.headline} />
        </div>
      )}
      {game.status === 'scheduled' && game.form && (
        <div className="mt-auto">
          <FormStrip game={game} />
        </div>
      )}
    </div>
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
