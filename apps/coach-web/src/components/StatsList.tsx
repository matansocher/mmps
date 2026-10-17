import { useState } from 'react';
import { messages } from '../lib/i18n';
import type { GameStatRow } from '../types';

function StatRow({ stat }: { readonly stat: GameStatRow }) {
  const home = parseFloat(stat.home) || 0;
  const away = parseFloat(stat.away) || 0;
  const total = home + away;
  const homePct = total > 0 ? (home / total) * 100 : 50;
  const homeLeads = home > away;
  const awayLeads = away > home;
  return (
    <div className="flex flex-col gap-1.5 px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <span className={`score-font ${homeLeads ? 'text-text-primary' : 'text-text-secondary'}`}>{stat.home}</span>
        <span className="text-xs text-text-secondary">{stat.name}</span>
        <span className={`score-font ${awayLeads ? 'text-text-primary' : 'text-text-secondary'}`}>{stat.away}</span>
      </div>
      <div className="flex h-1.5 gap-1">
        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-bg-elevated">
          <div className={`h-full rounded-full ${homeLeads ? 'bg-accent-brand' : 'bg-text-muted/60'}`} style={{ width: `${homePct}%` }} />
        </div>
        <div className="flex-1 overflow-hidden rounded-full bg-bg-elevated">
          <div className={`h-full rounded-full ${awayLeads ? 'bg-accent-brand' : 'bg-text-muted/60'}`} style={{ width: `${100 - homePct}%` }} />
        </div>
      </div>
    </div>
  );
}

export function StatsList({ stats }: { readonly stats: readonly GameStatRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const major = stats.filter((s) => s.isMajor);
  const visible = showAll || major.length === 0 ? stats : major;
  if (!stats.length) return <p className="px-4 py-6 text-center text-sm text-text-muted">{messages().game.noStats}</p>;
  return (
    <div className="flex flex-col py-2">
      {visible.map((stat) => (
        <StatRow key={stat.id} stat={stat} />
      ))}
      {major.length > 0 && major.length < stats.length && (
        <button onClick={() => setShowAll(!showAll)} className="mt-1 py-2 text-sm font-semibold text-accent-brand">
          {showAll ? messages().game.showLess : messages().game.showAll(stats.length)}
        </button>
      )}
    </div>
  );
}
