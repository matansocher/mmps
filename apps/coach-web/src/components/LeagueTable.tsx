import { useLocation } from 'wouter';
import type { TableRow as Row } from '../types';

function zoneClass(zone: Row['zone']): string {
  if (zone === 'champions') return 'border-r-2 border-accent-win';
  if (zone === 'europe') return 'border-r-2 border-accent-draw';
  if (zone === 'relegation') return 'border-r-2 border-accent-loss';
  return '';
}

export function LeagueTable({ rows }: { rows: Row[] }) {
  const [, navigate] = useLocation();
  if (rows.length === 0) return null;
  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
      <div className="grid grid-cols-[2.5rem_1fr_3rem_3rem] text-xs text-text-secondary px-3 py-2 border-b border-border-subtle">
        <span>#</span>
        <span>קבוצה</span>
        <span className="text-left">משחקים</span>
        <span className="text-left">נקודות</span>
      </div>
      {rows.map((r) => (
        <button
          key={r.team.id}
          onClick={() => navigate(`/team/${r.team.id}`)}
          className={`w-full grid grid-cols-[2.5rem_1fr_3rem_3rem] items-center px-3 py-2 text-sm text-right hover:bg-bg-elevated/40 transition-colors ${zoneClass(r.zone)}`}
        >
          <span className="text-text-secondary score-font">{r.rank}</span>
          <span className="text-text-primary truncate text-right">{r.team.name}</span>
          <span className="text-left text-text-secondary score-font">{r.played}</span>
          <span className="text-left text-text-primary score-font font-semibold">{r.points}</span>
        </button>
      ))}
    </div>
  );
}
