import { EVENT_META, eventDetail } from '../lib/format';
import { navigate } from '../lib/router';
import type { GameEvent } from '../types';

function PlayerLink({ name, athleteId, muted }: { readonly name: string; readonly athleteId?: number; readonly muted?: boolean }) {
  const cls = muted ? 'text-text-muted' : 'text-text-primary';
  if (!athleteId) return <span className={cls}>{name}</span>;
  return (
    <button onClick={() => navigate({ name: 'player', id: athleteId })} className={`${cls} hover:underline`}>
      {name}
    </button>
  );
}

function EventBody({ event }: { readonly event: GameEvent }) {
  const detail = eventDetail(event);
  if (event.type === 'substitution') {
    return (
      <span className="flex min-w-0 flex-col">
        {event.playerName && (
          <span className="truncate">
            <span className="text-accent-live">▲ </span>
            <PlayerLink name={event.playerName} athleteId={event.playerAthleteId} />
          </span>
        )}
        {event.assistName && (
          <span className="truncate text-xs">
            <span className="text-accent-red">▼ </span>
            <PlayerLink name={event.assistName} athleteId={event.assistAthleteId} muted />
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate">{event.playerName ? <PlayerLink name={event.playerName} athleteId={event.playerAthleteId} /> : (detail ?? EVENT_META[event.type].title)}</span>
      {(event.assistName || (detail && event.playerName)) && (
        <span className="truncate text-xs text-text-muted">
          {event.assistName && (
            <>
              Assist: <PlayerLink name={event.assistName} athleteId={event.assistAthleteId} muted />
            </>
          )}
          {event.assistName && detail && event.playerName && ' · '}
          {detail && event.playerName && detail}
        </span>
      )}
    </span>
  );
}

export function EventsTimeline({ events }: { readonly events: readonly GameEvent[] }) {
  if (!events.length) return <p className="px-4 py-6 text-center text-sm text-text-muted">No events yet</p>;
  const ordered = [...events].reverse();
  return (
    <ul className="flex flex-col divide-y divide-border-subtle">
      {ordered.map((event) => {
        const isHome = event.side === 'home';
        return (
          <li key={event.key} className={`flex items-center gap-3 px-3 py-2.5 text-sm ${isHome ? '' : 'flex-row-reverse text-right'}`}>
            <span className="score-font w-10 shrink-0 text-center text-xs text-accent-live">{event.minuteDisplay}</span>
            <span className="shrink-0 text-base">{EVENT_META[event.type].icon}</span>
            <span className={`flex min-w-0 flex-1 ${isHome ? '' : 'justify-end'}`}>
              <EventBody event={event} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
