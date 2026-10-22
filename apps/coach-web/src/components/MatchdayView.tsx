import { useState } from 'react';
import { messages } from '../lib/i18n';
import { formatDateTitle, formatKickoff } from '../lib/format';
import { navigate } from '../lib/router';
import { hapticSelect } from '../lib/telegram';
import type { GameSummary, Matchday } from '../types';
import { Icon } from './Icon';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';
import { Card, ScoreLine } from './ui';

function localDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA');
}

function groupByDay(games: readonly GameSummary[]): { day: string; games: GameSummary[] }[] {
  const days = new Map<string, GameSummary[]>();
  for (const game of games) {
    const key = localDateKey(game.startTime);
    days.set(key, [...(days.get(key) ?? []), game]);
  }
  return [...days.entries()].map(([day, list]) => ({ day, games: list }));
}

function MatchdayGame({ game, favoriteIds }: { readonly game: GameSummary; readonly favoriteIds: ReadonlySet<number> }) {
  const t = messages();
  const hasScore = (game.status === 'finished' || game.status === 'live') && game.home.score !== null;
  const live = game.status === 'live';
  const team = (side: 'home' | 'away') => {
    const value = game[side];
    const favorite = favoriteIds.has(value.id);
    const other = game[side === 'home' ? 'away' : 'home'];
    const winner = game.status === 'finished' && value.score !== null && other.score !== null && value.score > other.score;
    return (
      <span className={`flex min-w-0 flex-1 items-center gap-2 ${side === 'home' ? 'justify-end' : ''}`}>
        {side === 'away' && <TeamLogo teamId={value.id} name={value.name} size={22} />}
        <span className={`truncate text-sm ${favorite ? 'font-bold text-text-primary' : winner ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
          {value.shortName || value.name}
        </span>
        {favorite && <Icon name="star" size={10} className="shrink-0 text-accent-draw" title={t.common.favouriteTeam} />}
        {side === 'home' && <TeamLogo teamId={value.id} name={value.name} size={22} />}
      </span>
    );
  };
  return (
    <button
      onClick={() => navigate({ name: 'game', id: game.id })}
      className="flex w-full items-center gap-2 px-3 py-3 text-start transition hover:bg-bg-elevated/60"
      aria-label={`${game.home.name} ${hasScore ? `${game.home.score}-${game.away.score}` : t.common.vs} ${game.away.name}${live ? `, ${t.common.live}` : ''}`}
    >
      {team('home')}
      <span className="flex w-16 shrink-0 flex-col items-center gap-0.5">
        {hasScore ? (
          <span className={`score-font text-base ${live ? 'text-accent-live' : 'text-text-primary'}`}>
            <ScoreLine home={game.home.score} away={game.away.score} />
          </span>
        ) : game.status === 'scheduled' ? (
          <span className="score-font text-sm text-text-primary">{formatKickoff(game.startTime)}</span>
        ) : (
          <span className="text-caption font-semibold text-accent-red">{game.statusText || t.common.tbd}</span>
        )}
        {live && (
          <span className="flex items-center gap-1 text-caption font-bold text-accent-live">
            <LiveDot />
            {game.statusText || t.common.live}
          </span>
        )}
      </span>
      {team('away')}
    </button>
  );
}

function defaultRound(matchdays: readonly Matchday[]): number {
  return (matchdays.find((m) => m.kind === 'current') ?? matchdays.find((m) => m.kind === 'previous') ?? matchdays[0]).roundNum;
}

export function MatchdayView({ matchdays, favoriteIds }: { readonly matchdays: readonly Matchday[]; readonly favoriteIds: readonly number[] }) {
  const t = messages().league;
  const [selected, setSelected] = useState<number | null>(null);
  const active = matchdays.find((m) => m.roundNum === selected) ?? matchdays.find((m) => m.roundNum === defaultRound(matchdays))!;
  const favorites = new Set(favoriteIds);
  const played = active.games.filter((g) => g.status === 'finished').length;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${matchdays.length}, minmax(0, 1fr))` }} role="group" aria-label={t.matchdays}>
        {matchdays.map((m) => {
          const isActive = m.roundNum === active.roundNum;
          return (
            <button
              key={m.roundNum}
              aria-pressed={isActive}
              onClick={() => {
                hapticSelect();
                setSelected(m.roundNum);
              }}
              className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 transition ${
                isActive ? 'border-accent-live/50 bg-accent-live/10 text-text-primary' : 'border-transparent bg-bg-card text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="flex items-center gap-1 text-caption font-semibold uppercase tracking-wide text-text-muted">
                {m.games.some((g) => g.status === 'live') && <LiveDot />}
                {t.matchdayKind[m.kind]}
              </span>
              <span className="text-sm font-bold">{t.matchday(m.roundNum)}</span>
            </button>
          );
        })}
      </div>

      <p className="px-1 text-xs text-text-muted" aria-live="polite">
        {t.matchday(active.roundNum)} · {active.kind === 'next' ? t.gamesCount(active.games.length) : t.playedOf(played, active.games.length)}
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {groupByDay(active.games).map(({ day, games }) => (
          <section key={day} className="flex flex-col gap-1.5">
            <h3 className="px-1 text-xs font-semibold text-text-secondary">{formatDateTitle(day)}</h3>
            <Card className="divide-y divide-border-subtle">
              {games.map((g) => (
                <MatchdayGame key={g.id} game={g} favoriteIds={favorites} />
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
