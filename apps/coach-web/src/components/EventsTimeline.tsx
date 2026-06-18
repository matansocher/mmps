import { useState } from 'react';
import type { MatchEvent } from '../types';

const EVENT_ICON: Record<number, string> = {
  1: '⚽',   // Goal
  2: '🟨',   // Yellow card
  3: '🟥',   // Red card
  4: '🔄',   // Substitution
  12: '🪵',  // Woodwork
};

function iconFor(typeId: number): string {
  return EVENT_ICON[typeId] ?? '•';
}

function isImportant(event: MatchEvent): boolean {
  return event.typeId === 1 || event.typeId === 3;
}

export function EventsTimeline({ events }: { events: MatchEvent[] }) {
  const [showAll, setShowAll] = useState(false);
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => a.minute - b.minute);
  const visible = showAll ? sorted : sorted.filter(isImportant);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-text-secondary text-sm font-semibold">אירועי המשחק</h2>
        <div className="flex gap-1 rounded-lg bg-bg-card border border-border-subtle p-0.5">
          <ToggleButton label="חשובים" active={!showAll} onClick={() => setShowAll(false)} />
          <ToggleButton label="הכל" active={showAll} onClick={() => setShowAll(true)} />
        </div>
      </div>
      {visible.length === 0 ? (
        <div className="bg-bg-card border border-border-subtle rounded-xl px-3 py-3 text-text-muted text-xs text-center">
          אין אירועים חשובים
        </div>
      ) : (
        <div className="bg-bg-card border border-border-subtle rounded-xl divide-y divide-border-subtle overflow-hidden">
          {visible.map((e, idx) => (
            <EventRow key={idx} event={e} />
          ))}
        </div>
      )}
    </section>
  );
}

function ToggleButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
        active ? 'bg-bg-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );
}

function EventRow({ event }: { event: MatchEvent }) {
  const minute = event.minuteDisplay || `${event.minute}'`;
  const isHome = event.side === 'home';
  const playerLine = event.playerName
    ? event.extraPlayerNames?.length
      ? `${event.playerName} (${event.extraPlayerNames.join(', ')})`
      : event.playerName
    : null;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 ${isHome ? '' : 'flex-row-reverse'}`}>
      <span className="text-text-secondary text-xs score-font w-10 text-center shrink-0">{minute}</span>
      <span className="text-lg shrink-0">{iconFor(event.typeId)}</span>
      <div className={`flex-1 min-w-0 ${isHome ? 'text-right' : 'text-left'}`}>
        <div className="text-text-primary text-sm truncate">
          {playerLine || event.typeName}
        </div>
        {playerLine && (
          <div className="text-text-muted text-xs truncate">
            {event.subTypeName || event.typeName}
          </div>
        )}
      </div>
    </div>
  );
}
