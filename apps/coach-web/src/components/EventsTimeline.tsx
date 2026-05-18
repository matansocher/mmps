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

export function EventsTimeline({ events }: { events: MatchEvent[] }) {
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => a.minute - b.minute);
  return (
    <section className="space-y-2">
      <h2 className="text-text-secondary text-sm font-semibold px-1">אירועי המשחק</h2>
      <div className="bg-bg-card border border-border-subtle rounded-xl divide-y divide-border-subtle overflow-hidden">
        {sorted.map((e, idx) => (
          <EventRow key={idx} event={e} />
        ))}
      </div>
    </section>
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
