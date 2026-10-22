import { messages } from '../lib/i18n';
import type { MouseEvent } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { navigate } from '../lib/router';
import type { Game, StandingsRow, StandingsTable } from '../types';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';
import { Card, FormBadge } from './ui';

function TrendArrow({ trend }: { readonly trend: number }) {
  if (!trend) return null;
  return trend > 0 ? (
    <span className="text-caption text-accent-win" aria-label={messages().standings.movedUp}>
      ▲
    </span>
  ) : (
    <span className="text-caption text-accent-red" aria-label={messages().standings.movedDown}>
      ▼
    </span>
  );
}

// Score of the game in play, from this row's team perspective, linking to the game.
function LiveScore({ row, game }: { readonly row: StandingsRow; readonly game?: Game }) {
  const open = (e: MouseEvent) => {
    e.stopPropagation();
    navigate({ name: 'game', id: row.liveGameId! });
  };
  if (!game || game.home.score === null || game.away.score === null) {
    return (
      <button onClick={open} className="flex shrink-0 items-center p-1" aria-label={messages().standings.openLiveGame}>
        <LiveDot />
      </button>
    );
  }
  const isHome = game.home.id === row.team.id;
  const [own, other] = isHome ? [game.home.score, game.away.score] : [game.away.score, game.home.score];
  const opponent = isHome ? game.away : game.home;
  const tone = own > other ? 'bg-accent-win/15 text-accent-win' : own < other ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-elevated text-text-secondary';
  return (
    <button onClick={open} title={messages().standings.versus(opponent.name)} className={`score-font flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-caption ${tone}`}>
      <LiveDot />
      {own}-{other}
      {game.minuteDisplay && <span className="ltr-num font-normal text-accent-live">{game.minuteDisplay}</span>}
    </button>
  );
}

export function LiveTableNote({ tables }: { readonly tables: readonly StandingsTable[] }) {
  if (!tables.some((t) => t.rows.some((r) => r.isLive))) return null;
  return (
    <p className="flex items-center gap-2 px-1 text-xs text-text-secondary">
      <LiveDot />
      <span>
        <span className="font-bold text-accent-live">{messages().standings.liveTable}</span> · {messages().standings.liveTableNote}
      </span>
    </p>
  );
}

export function StandingsTableView({ table, highlightIds = [], showForm = true }: { readonly table: StandingsTable; readonly highlightIds?: readonly number[]; readonly showForm?: boolean }) {
  const { data } = useDashboard();
  const gamesById = new Map((data?.games ?? []).map((g) => [g.id, g]));
  return (
    <Card>
      {table.name && <h3 className="border-b border-border-subtle px-3 py-2 text-sm font-bold">{table.name}</h3>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-caption text-text-muted">
            <th className="w-10 py-2 ps-3 text-start font-medium">#</th>
            <th className="py-2 text-start font-medium">{messages().standings.team}</th>
            <th className="w-8 py-2 text-center font-medium">{messages().standings.played}</th>
            <th className="hidden w-8 py-2 text-center font-medium sm:table-cell">{messages().standings.won}</th>
            <th className="hidden w-8 py-2 text-center font-medium sm:table-cell">{messages().standings.drawn}</th>
            <th className="hidden w-8 py-2 text-center font-medium sm:table-cell">{messages().standings.lost}</th>
            <th className="w-14 py-2 text-center font-medium">{messages().standings.goalDiff}</th>
            <th className="w-9 py-2 text-center font-medium">{messages().standings.points}</th>
            {showForm && <th className="hidden w-36 py-2 pe-3 text-center font-medium md:table-cell">{messages().standings.form}</th>}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => {
            const highlighted = highlightIds.includes(row.team.id);
            const gd = row.goalsFor - row.goalsAgainst;
            return (
              <tr
                key={row.team.id}
                onClick={() => navigate({ name: 'team', id: row.team.id })}
                className={`cursor-pointer border-t border-border-subtle transition hover:bg-bg-elevated/60 ${highlighted ? 'bg-accent-brand/10' : ''}`}
              >
                <td className="relative py-2 ps-3">
                  {row.zoneColor && <span className="absolute inset-y-1 start-0 w-1 rounded-e" style={{ backgroundColor: row.zoneColor }} />}
                  <span className="flex items-center gap-0.5">
                    <span className="score-font text-xs text-text-secondary">{row.position}</span>
                    <TrendArrow trend={row.trend} />
                  </span>
                </td>
                <td className="max-w-0 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <TeamLogo teamId={row.team.id} name={row.team.name} size={18} />
                    <span className={`truncate ${highlighted ? 'font-bold' : ''}`}>{row.team.name}</span>
                    {row.isLive && row.liveGameId ? <LiveScore row={row} game={gamesById.get(row.liveGameId)} /> : row.isLive && <LiveDot />}
                  </span>
                </td>
                <td className="score-font py-2 text-center text-xs font-normal text-text-secondary">{row.played}</td>
                <td className="score-font hidden py-2 text-center text-xs font-normal text-text-secondary sm:table-cell">{row.won}</td>
                <td className="score-font hidden py-2 text-center text-xs font-normal text-text-secondary sm:table-cell">{row.drawn}</td>
                <td className="score-font hidden py-2 text-center text-xs font-normal text-text-secondary sm:table-cell">{row.lost}</td>
                <td className="score-font py-2 text-center text-xs font-normal text-text-secondary">{gd > 0 ? `+${gd}` : gd}</td>
                <td className="score-font py-2 text-center">{row.points}</td>
                {showForm && (
                  <td className="hidden py-2 pe-3 md:table-cell">
                    <span className="flex justify-center gap-0.5">
                      {row.form.slice(-5).map((r, i) => (
                        <FormBadge key={i} result={r} />
                      ))}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

export function ZonesLegend({ zones }: { readonly zones: readonly { readonly name: string; readonly color: string }[] }) {
  if (!zones.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-xs text-text-secondary">
      {zones.map((z) => (
        <li key={z.name} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: z.color }} />
          {z.name}
        </li>
      ))}
    </ul>
  );
}
