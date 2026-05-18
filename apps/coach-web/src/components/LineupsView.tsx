import { useState } from 'react';
import type { LineupPlayer, LineupSide, TeamRef } from '../types';
import { athletePhoto } from '../lib/logos';

type Props = {
  home: { team: TeamRef; lineup: LineupSide };
  away: { team: TeamRef; lineup: LineupSide };
};

export function LineupsView({ home, away }: Props) {
  const [expandBench, setExpandBench] = useState(false);
  const hasBench = home.lineup.bench.length > 0 || away.lineup.bench.length > 0;

  return (
    <section className="space-y-2">
      <h2 className="text-text-secondary text-sm font-semibold px-1">הרכבים</h2>
      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
        <FormationHeader home={home} away={away} />
        <div className="grid grid-cols-2 divide-x divide-border-subtle">
          <SideList players={home.lineup.starting} align="end" />
          <SideList players={away.lineup.starting} align="start" />
        </div>
        {hasBench && (
          <>
            <button
              onClick={() => setExpandBench((v) => !v)}
              className="w-full text-center py-2 text-text-secondary text-xs border-t border-border-subtle hover:text-text-primary"
            >
              {expandBench ? 'הסתר ספסל ↑' : `ספסל (${home.lineup.bench.length + away.lineup.bench.length}) ↓`}
            </button>
            {expandBench && (
              <div className="grid grid-cols-2 divide-x divide-border-subtle border-t border-border-subtle">
                <SideList players={home.lineup.bench} align="end" />
                <SideList players={away.lineup.bench} align="start" />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function FormationHeader({ home, away }: Props) {
  return (
    <div className="grid grid-cols-2 divide-x divide-border-subtle border-b border-border-subtle">
      <div className="px-3 py-2 text-right">
        <div className="text-text-primary text-sm font-semibold truncate">{home.team.name}</div>
        {home.lineup.formation && <div className="text-text-secondary text-xs">{home.lineup.formation}</div>}
      </div>
      <div className="px-3 py-2 text-left">
        <div className="text-text-primary text-sm font-semibold truncate">{away.team.name}</div>
        {away.lineup.formation && <div className="text-text-secondary text-xs">{away.lineup.formation}</div>}
      </div>
    </div>
  );
}

function SideList({ players, align }: { players: readonly LineupPlayer[]; align: 'start' | 'end' }) {
  if (players.length === 0) {
    return <div className="px-3 py-3 text-text-muted text-xs">—</div>;
  }
  return (
    <ul className="divide-y divide-border-subtle">
      {players.map((p) => (
        <li key={p.memberId} className={`flex items-center gap-2 px-3 py-2 ${align === 'end' ? '' : 'flex-row-reverse'}`}>
          {p.athleteId > 0 && (
            <img src={athletePhoto(p.athleteId)} alt="" loading="lazy" className="w-7 h-7 rounded-full bg-bg-elevated shrink-0" />
          )}
          {p.jerseyNumber != null && (
            <span className="score-font text-text-muted text-xs w-5 text-center shrink-0">{p.jerseyNumber}</span>
          )}
          <div className={`flex-1 min-w-0 ${align === 'end' ? 'text-right' : 'text-left'}`}>
            <div className="text-text-primary text-xs truncate">{p.shortName || p.name}</div>
            {p.position && <div className="text-text-muted text-[10px] truncate">{p.position}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
