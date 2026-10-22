import { messages } from '../lib/i18n';
import { useState } from 'react';
import { navigate } from '../lib/router';
import type { LineupPlayer, Team, TeamLineup } from '../types';
import { PlayerPhoto } from './PlayerPhoto';
import { TeamLogo } from './TeamLogo';
import { Card, Section, Tabs } from './ui';

function ratingClass(rating: number): string {
  if (rating >= 8) return 'bg-rating-top';
  if (rating >= 7) return 'bg-rating-good';
  if (rating >= 6) return 'bg-rating-avg';
  return 'bg-rating-poor';
}

function Rating({ rating, best, className = '' }: { readonly rating: number; readonly best: boolean; readonly className?: string }) {
  return (
    <span className={`score-font flex items-center gap-0.5 rounded px-1 text-caption text-white ${ratingClass(rating)} ${className}`}>
      {best && <span aria-hidden>★</span>}
      {rating.toFixed(1)}
    </span>
  );
}

function openPlayer(player: LineupPlayer) {
  if (player.athleteId) navigate({ name: 'player', id: player.athleteId });
}

function Pitch() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-pitch to-pitch-dark">
      <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 10%, transparent 10% 20%)' }} />
      <div className="absolute left-1/2 top-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      <div className="absolute inset-x-0 top-1/2 border-t border-white/25" />
      <div className="absolute bottom-0 left-1/2 h-[16%] w-[44%] -translate-x-1/2 border-x border-t border-white/25" />
      <div className="absolute left-1/2 top-0 h-[16%] w-[44%] -translate-x-1/2 border-x border-b border-white/25" />
      <div className="absolute bottom-0 left-1/2 h-[7%] w-[22%] -translate-x-1/2 border-x border-t border-white/25" />
      <div className="absolute left-1/2 top-0 h-[7%] w-[22%] -translate-x-1/2 border-x border-b border-white/25" />
    </div>
  );
}

function PlayerToken({ player, bestRating }: { readonly player: LineupPlayer; readonly bestRating?: number }) {
  const left = `${11 + (player.fieldSide ?? 50) * 0.78}%`;
  const top = `${8 + (100 - (player.fieldLine ?? 0)) * 0.84}%`;
  return (
    <button
      onClick={() => openPlayer(player)}
      disabled={!player.athleteId}
      className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 transition hover:scale-105"
      style={{ left, top }}
    >
      <span className="relative">
        <PlayerPhoto athleteId={player.athleteId} name={player.name} size={40} className="border-2 border-white/80" />
        {player.jerseyNumber != null && (
          <span className="score-font absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-caption text-bg-base">{player.jerseyNumber}</span>
        )}
        {player.rating != null && (
          <Rating rating={player.rating} best={player.rating === bestRating} className="absolute -bottom-1 left-1/2 -translate-x-1/2" />
        )}
        {player.subbedOffAt != null && <span className="absolute -right-1.5 -top-1 rounded-full bg-bg-base px-0.5 text-caption text-accent-red">▼{player.subbedOffAt}'</span>}
      </span>
      <span className="mt-1 max-w-full truncate rounded bg-black/40 px-1 text-caption font-medium leading-tight text-white">{player.shortName || player.name}</span>
    </button>
  );
}

export function FormationPitch({ lineup, bestRating }: { readonly lineup: TeamLineup; readonly bestRating?: number }) {
  const positioned = lineup.starting.filter((p) => p.fieldLine != null && p.fieldSide != null);
  if (!positioned.length) return null;
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-xl">
      <Pitch />
      {positioned.map((p, i) => (
        <PlayerToken key={p.athleteId ?? i} player={p} bestRating={bestRating} />
      ))}
      {lineup.formation && <span className="score-font absolute bottom-2 right-2 rounded-md bg-black/45 px-2 py-1 text-xs text-white">{lineup.formation}</span>}
    </div>
  );
}

function PlayerListRow({ player, note, bestRating }: { readonly player: LineupPlayer; readonly note?: string; readonly bestRating?: number }) {
  return (
    <button onClick={() => openPlayer(player)} disabled={!player.athleteId} className="flex w-full items-center gap-3 px-3 py-2 text-start transition enabled:hover:bg-row-hover">
      <span className="score-font w-6 shrink-0 text-center text-xs text-text-secondary">{player.jerseyNumber ?? ''}</span>
      <PlayerPhoto athleteId={player.athleteId} name={player.name} size={32} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{player.name}</span>
        {(player.position || note) && <span className="truncate text-xs text-text-secondary">{[player.position, note].filter(Boolean).join(' · ')}</span>}
      </span>
      {player.subbedOnAt != null && <span className="score-font shrink-0 text-xs text-accent-live">▲ {player.subbedOnAt}'</span>}
      {player.subbedOffAt != null && <span className="score-font shrink-0 text-xs text-accent-red">▼ {player.subbedOffAt}'</span>}
      {player.rating != null && <Rating rating={player.rating} best={player.rating === bestRating} className="shrink-0 px-1.5 py-0.5" />}
    </button>
  );
}

function PlayerList({ title, players, note, bestRating }: { readonly title: string; readonly players: readonly LineupPlayer[]; readonly note?: (p: LineupPlayer) => string | undefined; readonly bestRating?: number }) {
  if (!players.length) return null;
  return (
    <Section title={messages().common.count(title, players.length)}>
      <Card className="divide-y divide-border-subtle">
        {players.map((p, i) => (
          <PlayerListRow key={p.athleteId ?? `${p.name}-${i}`} player={p} note={note?.(p)} bestRating={bestRating} />
        ))}
      </Card>
    </Section>
  );
}

// Top rating across both teams marks the player of the match.
function bestRatingOf(lineups: { readonly home: TeamLineup; readonly away: TeamLineup }): number | undefined {
  const ratings = [lineups.home, lineups.away].flatMap((l) => [...l.starting, ...l.bench]).flatMap((p) => (p.rating != null ? [p.rating] : []));
  return ratings.length ? Math.max(...ratings) : undefined;
}

export function LineupsView({ home, away, lineups }: { readonly home: Team; readonly away: Team; readonly lineups: { readonly home: TeamLineup; readonly away: TeamLineup } }) {
  const [side, setSide] = useState<'home' | 'away'>('home');
  const lineup = lineups[side];
  const teams = { home, away };
  const bestRating = bestRatingOf(lineups);
  return (
    <div className="flex flex-col gap-4">
      <Tabs
        tabs={(['home', 'away'] as const).map((s) => ({
          id: s,
          label: (
            <>
              <TeamLogo teamId={teams[s].id} name={teams[s].name} size={18} />
              <span className="truncate">{teams[s].shortName || teams[s].name}</span>
              {lineups[s].formation && <span className="score-font text-xs text-text-secondary">{lineups[s].formation}</span>}
            </>
          ),
        }))}
        active={side}
        onChange={setSide}
      />
      {lineup.status && <p className="text-center text-xs text-text-secondary">{lineup.status}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <FormationPitch lineup={lineup} bestRating={bestRating} />
        <div className="flex flex-col gap-4">
          <PlayerList title={messages().game.startingXI} players={lineup.starting} bestRating={bestRating} />
          <PlayerList title={messages().game.substitutes} players={lineup.bench} bestRating={bestRating} />
          <PlayerList title={messages().game.missing} players={lineup.missing} />
          {lineup.coach && (
            <Section title={messages().game.coach}>
              <Card className="px-4 py-3 text-sm">{lineup.coach}</Card>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
