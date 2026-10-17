import { navigate } from '../lib/router';
import type { StandingsTable } from '../types';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';
import { Card, FormBadge } from './ui';

export function StandingsTableView({ table, highlightIds = [], showForm = true }: { readonly table: StandingsTable; readonly highlightIds?: readonly number[]; readonly showForm?: boolean }) {
  return (
    <Card>
      {table.name && <h3 className="border-b border-border-subtle px-3 py-2 text-sm font-bold">{table.name}</h3>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-text-muted">
            <th className="w-8 py-2 ps-3 text-start font-medium">#</th>
            <th className="py-2 text-start font-medium">Team</th>
            <th className="w-8 py-2 text-center font-medium">P</th>
            <th className="hidden w-8 py-2 text-center font-medium sm:table-cell">W</th>
            <th className="hidden w-8 py-2 text-center font-medium sm:table-cell">D</th>
            <th className="hidden w-8 py-2 text-center font-medium sm:table-cell">L</th>
            <th className="w-14 py-2 text-center font-medium">GD</th>
            <th className="w-9 py-2 text-center font-medium">Pts</th>
            {showForm && <th className="hidden w-36 py-2 pe-3 text-center font-medium md:table-cell">Form</th>}
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
                  <span className="score-font text-xs text-text-secondary">{row.position}</span>
                </td>
                <td className="max-w-0 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <TeamLogo teamId={row.team.id} name={row.team.name} size={18} />
                    <span className={`truncate ${highlighted ? 'font-bold' : ''}`}>{row.team.name}</span>
                    {row.isLive && <LiveDot />}
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
