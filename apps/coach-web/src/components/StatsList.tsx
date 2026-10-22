import { useState } from 'react';
import { messages } from '../lib/i18n';
import type { GameStatRow } from '../types';

type Colors = { readonly home: string; readonly away: string };

const POSSESSION_STAT_ID = 10;

// Shares of a whole (possession) read best as one split bar rather than two.
function isSplit(stat: GameStatRow, home: number, away: number): boolean {
  return stat.id === POSSESSION_STAT_ID || (stat.home.endsWith('%') && stat.away.endsWith('%') && Math.abs(home + away - 100) <= 1);
}

function StatRow({ stat, colors }: { readonly stat: GameStatRow; readonly colors: Colors }) {
  const home = parseFloat(stat.home) || 0;
  const away = parseFloat(stat.away) || 0;
  const total = home + away;
  const homePct = total > 0 ? (home / total) * 100 : 50;
  const homeLeads = home > away;
  const awayLeads = away > home;
  const valueClass = (leads: boolean, trails: boolean) => `score-font ${leads ? 'font-bold text-text-primary' : trails ? 'text-text-muted' : 'text-text-secondary'}`;
  return (
    <div className="flex flex-col gap-1.5 px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <span className={valueClass(homeLeads, awayLeads)}>{stat.home}</span>
        <span className="text-xs text-text-secondary">{stat.name}</span>
        <span className={valueClass(awayLeads, homeLeads)}>{stat.away}</span>
      </div>
      {isSplit(stat, home, away) ? (
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          <div className="h-full" style={{ width: `${homePct}%`, backgroundColor: colors.home, opacity: awayLeads ? 0.55 : 1 }} />
          <div className="h-full flex-1" style={{ backgroundColor: colors.away, opacity: homeLeads ? 0.55 : 1 }} />
        </div>
      ) : (
        <div className="flex h-1.5 gap-1">
          <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-bg-elevated">
            <div className="h-full rounded-full" style={{ width: `${homePct}%`, backgroundColor: colors.home, opacity: awayLeads ? 0.55 : 1 }} />
          </div>
          <div className="flex-1 overflow-hidden rounded-full bg-bg-elevated">
            <div className="h-full rounded-full" style={{ width: `${100 - homePct}%`, backgroundColor: colors.away, opacity: homeLeads ? 0.55 : 1 }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function StatsList({ stats, colors }: { readonly stats: readonly GameStatRow[]; readonly colors: Colors }) {
  const [showAll, setShowAll] = useState(false);
  const major = stats.filter((s) => s.isMajor);
  const visible = showAll || major.length === 0 ? stats : major;
  if (!stats.length) return <p className="px-4 py-6 text-center text-sm text-text-muted">{messages().game.noStats}</p>;
  return (
    <div className="flex flex-col py-2">
      {visible.map((stat) => (
        <StatRow key={stat.id} stat={stat} colors={colors} />
      ))}
      {major.length > 0 && major.length < stats.length && (
        <button onClick={() => setShowAll(!showAll)} className="mt-1 py-2 text-sm font-semibold text-accent-brand">
          {showAll ? messages().game.showLess : messages().game.showAll(stats.length)}
        </button>
      )}
    </div>
  );
}
